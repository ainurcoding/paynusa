import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import {
  LedgerError,
  type Account,
  createAccount,
  getAccount,
  postJournal,
  reconcile,
  reverseJournal,
} from './ledger.js';

const uuid = z.string().uuid();
const amount = z.string().regex(/^[1-9][0-9]{0,14}$/, 'nominal harus bilangan bulat positif (maks 15 digit)');

const createAccountBody = z.object({
  ownerRef: z.string().min(1).max(128),
  type: z.enum(['WALLET_USER', 'WALLET_MERCHANT', 'TOPUP_CLEARING', 'REVENUE']),
  currency: z.string().regex(/^[A-Z]{3}$/).optional(),
});

const journalBody = z.object({
  idempotencyKey: z.string().min(8).max(128),
  transactionRef: z.string().min(1).max(128),
  // CORRECTION hanya dibuat lewat endpoint reverse
  kind: z.enum(['TOPUP', 'TRANSFER', 'PAYMENT', 'REFUND']),
  lines: z
    .array(
      z.object({
        accountId: uuid,
        direction: z.enum(['DEBIT', 'CREDIT']),
        amount,
      }),
    )
    .min(2)
    .max(20),
});

const reverseBody = z.object({ idempotencyKey: z.string().min(8).max(128) });

const STATUS_BY_CODE: Record<LedgerError['code'], number> = {
  INVALID_JOURNAL: 400,
  ACCOUNT_NOT_FOUND: 404,
  JOURNAL_NOT_FOUND: 404,
  ACCOUNT_NOT_ACTIVE: 422,
  CURRENCY_MISMATCH: 422,
  INSUFFICIENT_FUNDS: 422,
  ACCOUNT_EXISTS: 409,
  IDEMPOTENCY_CONFLICT: 409,
  ALREADY_REVERSED: 409,
};

function serializeAccount(a: Account) {
  return { ...a, balance: a.balance.toString() };
}

const route =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

/**
 * CATATAN KEAMANAN: API ini internal dan belum punya autentikasi antar service.
 * Jangan diekspos ke luar; HOST bawaan hanya 127.0.0.1. mTLS dan autentikasi
 * service ditambahkan pada task terkait.
 */
export function createApp(pool: Pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(
    '/ready',
    route(async (_req, res) => {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    }),
  );

  app.post(
    '/accounts',
    route(async (req, res) => {
      const body = createAccountBody.parse(req.body);
      const account = await createAccount(pool, body);
      res.status(201).json(serializeAccount(account));
    }),
  );

  app.get(
    '/accounts/:id',
    route(async (req, res) => {
      const id = uuid.parse(req.params.id);
      const account = await getAccount(pool, id);
      if (!account) {
        res.status(404).json({ error: 'ACCOUNT_NOT_FOUND' });
        return;
      }
      res.json(serializeAccount(account));
    }),
  );

  app.post(
    '/journals',
    route(async (req, res) => {
      const body = journalBody.parse(req.body);
      const posted = await postJournal(pool, {
        idempotencyKey: body.idempotencyKey,
        transactionRef: body.transactionRef,
        kind: body.kind,
        lines: body.lines.map((l) => ({ ...l, amount: BigInt(l.amount) })),
      });
      res.status(posted.replayed ? 200 : 201).json(posted);
    }),
  );

  app.post(
    '/journals/:id/reverse',
    route(async (req, res) => {
      const journalId = uuid.parse(req.params.id);
      const body = reverseBody.parse(req.body);
      const posted = await reverseJournal(pool, { journalId, idempotencyKey: body.idempotencyKey });
      res.status(posted.replayed ? 200 : 201).json(posted);
    }),
  );

  // Hanya untuk operator/security analyst. Perlu dilindungi saat autentikasi ditambahkan.
  app.get(
    '/reconcile',
    route(async (_req, res) => {
      const mismatches = await reconcile(pool);
      res.json({
        mismatches: mismatches.map((m) => ({
          accountId: m.accountId,
          stored: m.stored.toString(),
          computed: m.computed.toString(),
        })),
      });
    }),
  );

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof z.ZodError) {
      res.status(400).json({
        error: 'VALIDATION',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      });
      return;
    }
    if (err instanceof LedgerError) {
      res.status(STATUS_BY_CODE[err.code]).json({ error: err.code, message: err.message });
      return;
    }
    const e = err as { status?: number; statusCode?: number };
    const status = e.status ?? e.statusCode;
    if (typeof status === 'number' && status >= 400 && status < 500) {
      res.status(status).json({ error: 'BAD_REQUEST' });
      return;
    }
    // Hanya nama dan kode yang dicatat, agar detail kueri atau data tidak bocor ke log.
    const info = err as { name?: string; code?: string };
    console.error(JSON.stringify({ level: 'error', msg: 'unhandled', name: info.name, code: info.code }));
    res.status(500).json({ error: 'INTERNAL' });
  });

  return app;
}
