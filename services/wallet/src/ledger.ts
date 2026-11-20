import { createHash } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';

export type Direction = 'DEBIT' | 'CREDIT';
export type JournalKind = 'TOPUP' | 'TRANSFER' | 'PAYMENT' | 'REFUND' | 'CORRECTION';
export type AccountType = 'WALLET_USER' | 'WALLET_MERCHANT' | 'TOPUP_CLEARING' | 'REVENUE';

export type LedgerErrorCode =
  | 'INVALID_JOURNAL'
  | 'ACCOUNT_NOT_FOUND'
  | 'ACCOUNT_NOT_ACTIVE'
  | 'ACCOUNT_EXISTS'
  | 'CURRENCY_MISMATCH'
  | 'INSUFFICIENT_FUNDS'
  | 'IDEMPOTENCY_CONFLICT'
  | 'JOURNAL_NOT_FOUND'
  | 'ALREADY_REVERSED';

export class LedgerError extends Error {
  constructor(
    readonly code: LedgerErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'LedgerError';
  }
}

/** Batas satu baris: 10^15 - 1 satuan terkecil, jauh di bawah batas bigint (menghindari overflow). */
export const MAX_AMOUNT = 10n ** 15n - 1n;

export interface LineInput {
  accountId: string;
  direction: Direction;
  amount: bigint;
}

export interface PostJournalInput {
  idempotencyKey: string;
  transactionRef: string;
  kind: JournalKind;
  lines: LineInput[];
  reversesJournalId?: string;
}

export interface PostedJournal {
  id: string;
  /** true jika idempotency key yang sama sudah pernah diproses (tidak ada jurnal baru). */
  replayed: boolean;
}

export interface Account {
  id: string;
  ownerRef: string;
  type: AccountType;
  currency: string;
  status: string;
  balance: bigint;
}

export interface Mismatch {
  accountId: string;
  stored: bigint;
  computed: bigint;
}

// ---------------------------------------------------------------------------
// Utilitas internal
// ---------------------------------------------------------------------------

async function withTx<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: string; constraint?: string };
  return e.code === '23505' && (constraint === undefined || e.constraint === constraint);
}

function invalid(message: string): LedgerError {
  return new LedgerError('INVALID_JOURNAL', message);
}

function validate(input: PostJournalInput): void {
  if (input.idempotencyKey.trim() === '') throw invalid('idempotencyKey wajib diisi');
  if (input.transactionRef.trim() === '') throw invalid('transactionRef wajib diisi');
  if (input.lines.length < 2) throw invalid('Jurnal minimal terdiri dari dua baris');

  let debit = 0n;
  let credit = 0n;
  for (const line of input.lines) {
    if (typeof line.amount !== 'bigint' || line.amount <= 0n || line.amount > MAX_AMOUNT) {
      throw invalid('Nominal harus bilangan bulat positif dan tidak melebihi batas');
    }
    if (line.direction === 'DEBIT') debit += line.amount;
    else if (line.direction === 'CREDIT') credit += line.amount;
    else throw invalid('Arah harus DEBIT atau CREDIT');
  }
  if (debit !== credit) throw invalid('Total debit dan kredit tidak sama');
}

/** Sidik jari isi permintaan, untuk mendeteksi idempotency key yang dipakai ulang dengan isi berbeda. */
function requestHash(input: PostJournalInput): string {
  const lines = input.lines.map((l) => `${l.accountId}:${l.direction}:${l.amount}`).sort();
  const payload = JSON.stringify({
    t: input.transactionRef,
    k: input.kind,
    r: input.reversesJournalId ?? null,
    l: lines,
  });
  return createHash('sha256').update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// Inti: mencatat jurnal
// ---------------------------------------------------------------------------

async function postJournalTx(client: PoolClient, input: PostJournalInput): Promise<PostedJournal> {
  validate(input);
  const hash = requestHash(input);

  // 1. Idempotency: satu key = satu jurnal.
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO journal_entries (idempotency_key, request_hash, transaction_ref, kind, reverses_journal_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING id`,
    [input.idempotencyKey, hash, input.transactionRef, input.kind, input.reversesJournalId ?? null],
  );

  if (inserted.rowCount === 0) {
    const existing = await client.query<{ id: string; request_hash: string }>(
      'SELECT id, request_hash FROM journal_entries WHERE idempotency_key = $1',
      [input.idempotencyKey],
    );
    const row = existing.rows[0];
    if (!row) throw new Error('Jurnal dengan idempotency key tersebut tidak ditemukan');
    if (row.request_hash !== hash) {
      throw new LedgerError(
        'IDEMPOTENCY_CONFLICT',
        'Idempotency key sudah dipakai untuk permintaan dengan isi berbeda',
      );
    }
    return { id: row.id, replayed: true };
  }
  const journalId = inserted.rows[0].id;

  // 2. Kunci semua akun yang terlibat, selalu berurutan menurut id agar tidak deadlock.
  const accountIds = [...new Set(input.lines.map((l) => l.accountId))].sort();
  const accounts = await client.query<{
    id: string;
    status: string;
    currency: string;
    balance: string;
    allow_negative: boolean;
  }>(
    `SELECT id, status, currency, balance::text AS balance, allow_negative
       FROM accounts
      WHERE id = ANY($1::uuid[])
      ORDER BY id
        FOR UPDATE`,
    [accountIds],
  );
  if (accounts.rows.length !== accountIds.length) {
    throw new LedgerError('ACCOUNT_NOT_FOUND', 'Satu atau lebih akun tidak ditemukan');
  }
  if (new Set(accounts.rows.map((a) => a.currency)).size > 1) {
    throw new LedgerError('CURRENCY_MISMATCH', 'Semua akun dalam satu jurnal harus bermata uang sama');
  }

  // 3. Hitung perubahan saldo (saldo = kredit - debit) dan periksa aturannya.
  const delta = new Map<string, bigint>();
  for (const line of input.lines) {
    const change = line.direction === 'CREDIT' ? line.amount : -line.amount;
    delta.set(line.accountId, (delta.get(line.accountId) ?? 0n) + change);
  }
  for (const account of accounts.rows) {
    if (account.status !== 'ACTIVE') {
      throw new LedgerError('ACCOUNT_NOT_ACTIVE', 'Akun tidak aktif');
    }
    const next = BigInt(account.balance) + (delta.get(account.id) ?? 0n);
    if (next < 0n && !account.allow_negative) {
      throw new LedgerError('INSUFFICIENT_FUNDS', 'Saldo tidak mencukupi');
    }
  }

  // 4. Tulis baris ledger lalu perbarui saldo, semuanya dalam satu transaksi.
  const values: string[] = [];
  const tuples: string[] = [];
  input.lines.forEach((line, i) => {
    const o = i * 4;
    tuples.push(`($${o + 1}, $${o + 2}, $${o + 3}, $${o + 4})`);
    values.push(journalId, line.accountId, line.direction, line.amount.toString());
  });
  await client.query(
    `INSERT INTO ledger_lines (journal_id, account_id, direction, amount) VALUES ${tuples.join(', ')}`,
    values,
  );
  for (const [accountId, change] of delta) {
    await client.query('UPDATE accounts SET balance = balance + $2::bigint WHERE id = $1', [
      accountId,
      change.toString(),
    ]);
  }

  return { id: journalId, replayed: false };
}

export function postJournal(pool: Pool, input: PostJournalInput): Promise<PostedJournal> {
  return withTx(pool, (client) => postJournalTx(client, input));
}

/** Membalik jurnal yang sudah ada dengan jurnal koreksi baru (ledger tidak pernah diubah). */
export function reverseJournal(
  pool: Pool,
  params: { journalId: string; idempotencyKey: string },
): Promise<PostedJournal> {
  return withTx(pool, async (client) => {
    const journal = await client.query<{ transaction_ref: string }>(
      'SELECT transaction_ref FROM journal_entries WHERE id = $1',
      [params.journalId],
    );
    const original = journal.rows[0];
    if (!original) throw new LedgerError('JOURNAL_NOT_FOUND', 'Jurnal tidak ditemukan');

    const lines = await client.query<{ account_id: string; direction: Direction; amount: string }>(
      'SELECT account_id, direction, amount::text AS amount FROM ledger_lines WHERE journal_id = $1 ORDER BY id',
      [params.journalId],
    );
    const flipped: LineInput[] = lines.rows.map((r) => ({
      accountId: r.account_id,
      direction: r.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amount: BigInt(r.amount),
    }));

    try {
      return await postJournalTx(client, {
        idempotencyKey: params.idempotencyKey,
        transactionRef: original.transaction_ref,
        kind: 'CORRECTION',
        reversesJournalId: params.journalId,
        lines: flipped,
      });
    } catch (err) {
      if (isUniqueViolation(err, 'one_reversal_per_journal')) {
        throw new LedgerError('ALREADY_REVERSED', 'Jurnal ini sudah pernah dibalik');
      }
      throw err;
    }
  });
}

// ---------------------------------------------------------------------------
// Akun dan rekonsiliasi
// ---------------------------------------------------------------------------

type AccountRow = {
  id: string;
  owner_ref: string;
  type: AccountType;
  currency: string;
  status: string;
  balance: string;
};

const ACCOUNT_COLUMNS = 'id, owner_ref, type, currency, status, balance::text AS balance';

function toAccount(row: AccountRow): Account {
  return {
    id: row.id,
    ownerRef: row.owner_ref,
    type: row.type,
    currency: row.currency.trim(),
    status: row.status,
    balance: BigInt(row.balance),
  };
}

export async function createAccount(
  pool: Pool,
  input: { ownerRef: string; type: AccountType; currency?: string },
): Promise<Account> {
  try {
    const result = await pool.query<AccountRow>(
      `INSERT INTO accounts (owner_ref, type, currency, allow_negative)
       VALUES ($1, $2, $3, $4)
       RETURNING ${ACCOUNT_COLUMNS}`,
      [input.ownerRef, input.type, input.currency ?? 'IDR', input.type === 'TOPUP_CLEARING'],
    );
    return toAccount(result.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new LedgerError('ACCOUNT_EXISTS', 'Akun dengan pemilik dan tipe ini sudah ada');
    }
    throw err;
  }
}

export async function getAccount(pool: Pool, id: string): Promise<Account | null> {
  const result = await pool.query<AccountRow>(
    `SELECT ${ACCOUNT_COLUMNS} FROM accounts WHERE id = $1`,
    [id],
  );
  return result.rows[0] ? toAccount(result.rows[0]) : null;
}

/** Mencari akun yang saldo tersimpannya tidak sama dengan jumlah baris ledger-nya. */
export async function reconcile(pool: Pool): Promise<Mismatch[]> {
  const result = await pool.query<{ id: string; stored: string; computed: string }>(
    `SELECT a.id,
            a.balance::text AS stored,
            COALESCE(SUM(CASE l.direction WHEN 'CREDIT' THEN l.amount ELSE -l.amount END), 0)::text AS computed
       FROM accounts a
       LEFT JOIN ledger_lines l ON l.account_id = a.id
      GROUP BY a.id
     HAVING a.balance <> COALESCE(SUM(CASE l.direction WHEN 'CREDIT' THEN l.amount ELSE -l.amount END), 0)`,
  );
  return result.rows.map((r) => ({
    accountId: r.id,
    stored: BigInt(r.stored),
    computed: BigInt(r.computed),
  }));
}
