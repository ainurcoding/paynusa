import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPool } from '../src/db.js';
import {
  type Account,
  type PostJournalInput,
  createAccount,
  getAccount,
  postJournal,
  reconcile,
  reverseJournal,
} from '../src/ledger.js';
import { migrate } from '../src/migrate.js';

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error('TEST_DATABASE_URL belum diisi (lihat .env.example)');

const pool = createPool(url);
let clearing: Account;

const key = () => `k-${randomUUID()}`;
const wallet = (ownerRef: string) => createAccount(pool, { ownerRef, type: 'WALLET_USER' });
const balanceOf = async (id: string) => (await getAccount(pool, id))!.balance;

function transferInput(from: string, to: string, amount: bigint, idempotencyKey = key()): PostJournalInput {
  return {
    idempotencyKey,
    transactionRef: 'trx-test',
    kind: 'TRANSFER',
    lines: [
      { accountId: from, direction: 'DEBIT', amount },
      { accountId: to, direction: 'CREDIT', amount },
    ],
  };
}

async function fund(accountId: string, amount: bigint) {
  await postJournal(pool, {
    idempotencyKey: key(),
    transactionRef: 'fund',
    kind: 'TOPUP',
    lines: [
      { accountId: clearing.id, direction: 'DEBIT', amount },
      { accountId, direction: 'CREDIT', amount },
    ],
  });
}

beforeAll(async () => {
  await migrate(pool);
});

afterAll(async () => {
  await pool.end();
});

beforeEach(async () => {
  await pool.query('TRUNCATE ledger_lines, journal_entries, accounts RESTART IDENTITY CASCADE');
  clearing = await createAccount(pool, { ownerRef: 'bank-nusantara', type: 'TOPUP_CLEARING' });
});

describe('top-up dan transfer', () => {
  it('top-up menambah saldo wallet dan mengurangi akun penampungan', async () => {
    const a = await wallet('user-a');
    await fund(a.id, 100_000n);
    expect(await balanceOf(a.id)).toBe(100_000n);
    expect(await balanceOf(clearing.id)).toBe(-100_000n);
  });

  it('transfer memindahkan saldo dan total uang tetap', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await fund(a.id, 100_000n);
    await postJournal(pool, transferInput(a.id, b.id, 30_000n));
    expect(await balanceOf(a.id)).toBe(70_000n);
    expect(await balanceOf(b.id)).toBe(30_000n);
  });
});

describe('validasi jurnal', () => {
  it('menolak jurnal yang tidak seimbang', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    const input = transferInput(a.id, b.id, 10n);
    input.lines[1].amount = 9n;
    await expect(postJournal(pool, input)).rejects.toMatchObject({ code: 'INVALID_JOURNAL' });
  });

  it('menolak nominal nol atau negatif', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await expect(postJournal(pool, transferInput(a.id, b.id, 0n))).rejects.toMatchObject({
      code: 'INVALID_JOURNAL',
    });
    await expect(postJournal(pool, transferInput(a.id, b.id, -5n))).rejects.toMatchObject({
      code: 'INVALID_JOURNAL',
    });
  });

  it('menolak akun yang tidak ada', async () => {
    const a = await wallet('user-a');
    await fund(a.id, 100n);
    await expect(
      postJournal(pool, transferInput(a.id, randomUUID(), 10n)),
    ).rejects.toMatchObject({ code: 'ACCOUNT_NOT_FOUND' });
    expect(await balanceOf(a.id)).toBe(100n);
  });
});

describe('idempotency', () => {
  it('permintaan yang sama dua kali hanya memproses satu jurnal', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await fund(a.id, 100n);

    const input = transferInput(a.id, b.id, 40n, 'idem-same-request');
    const first = await postJournal(pool, input);
    const second = await postJournal(pool, input);

    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.id).toBe(first.id);
    expect(await balanceOf(a.id)).toBe(60n);
    expect(await balanceOf(b.id)).toBe(40n);
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM journal_entries WHERE idempotency_key = 'idem-same-request'",
    );
    expect(count.rows[0].n).toBe(1);
  });

  it('key yang sama dengan isi berbeda ditolak', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await fund(a.id, 100n);
    await postJournal(pool, transferInput(a.id, b.id, 10n, 'idem-conflict'));
    await expect(
      postJournal(pool, transferInput(a.id, b.id, 20n, 'idem-conflict')),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    expect(await balanceOf(a.id)).toBe(90n);
  });
});

describe('atomik dan konkuren', () => {
  it('saldo tidak cukup menggagalkan seluruh jurnal tanpa sisa', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await fund(a.id, 50n);
    const before = await pool.query('SELECT count(*)::int AS n FROM journal_entries');

    await expect(postJournal(pool, transferInput(a.id, b.id, 80n))).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
    });

    const after = await pool.query('SELECT count(*)::int AS n FROM journal_entries');
    expect(after.rows[0].n).toBe(before.rows[0].n);
    expect(await balanceOf(a.id)).toBe(50n);
    expect(await balanceOf(b.id)).toBe(0n);
  });

  it('lima transfer bersamaan dari saldo 100 (masing-masing 30): tepat tiga berhasil, saldo tidak minus', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await fund(a.id, 100n);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => postJournal(pool, transferInput(a.id, b.id, 30n))),
    );

    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    for (const f of failed) expect(f.reason).toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect(await balanceOf(a.id)).toBe(10n);
    expect(await balanceOf(b.id)).toBe(90n);
    expect(await reconcile(pool)).toEqual([]);
  });
});

describe('ledger append-only dan seimbang (lapisan database)', () => {
  it('UPDATE dan DELETE pada ledger_lines ditolak', async () => {
    const a = await wallet('user-a');
    await fund(a.id, 100n);
    await expect(pool.query('UPDATE ledger_lines SET amount = 1')).rejects.toThrow(/append-only/);
    await expect(pool.query('DELETE FROM ledger_lines')).rejects.toThrow(/append-only/);
    await expect(pool.query("UPDATE journal_entries SET kind = 'TRANSFER'")).rejects.toThrow(/append-only/);
  });

  it('database menolak jurnal tidak seimbang walau lewat SQL langsung', async () => {
    const a = await wallet('user-a');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const j = await client.query<{ id: string }>(
        `INSERT INTO journal_entries (idempotency_key, request_hash, transaction_ref, kind)
         VALUES ('raw-1', 'x', 'raw', 'TOPUP') RETURNING id`,
      );
      await client.query(
        "INSERT INTO ledger_lines (journal_id, account_id, direction, amount) VALUES ($1, $2, 'CREDIT', 100)",
        [j.rows[0].id, a.id],
      );
      await expect(client.query('COMMIT')).rejects.toThrow(/tidak seimbang/);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});

describe('koreksi (reversal)', () => {
  it('membalik jurnal dengan jurnal baru dan hanya boleh satu kali', async () => {
    const a = await wallet('user-a');
    const b = await wallet('user-b');
    await fund(a.id, 100n);
    const original = await postJournal(pool, transferInput(a.id, b.id, 40n));

    const reversal = await reverseJournal(pool, { journalId: original.id, idempotencyKey: 'rev-1-key' });
    expect(reversal.replayed).toBe(false);
    expect(await balanceOf(a.id)).toBe(100n);
    expect(await balanceOf(b.id)).toBe(0n);

    const row = await pool.query(
      'SELECT kind, reverses_journal_id FROM journal_entries WHERE id = $1',
      [reversal.id],
    );
    expect(row.rows[0]).toEqual({ kind: 'CORRECTION', reverses_journal_id: original.id });

    // permintaan ulang dengan key sama: tidak ada efek tambahan
    const again = await reverseJournal(pool, { journalId: original.id, idempotencyKey: 'rev-1-key' });
    expect(again.replayed).toBe(true);

    // key baru untuk jurnal yang sama: ditolak
    await expect(
      reverseJournal(pool, { journalId: original.id, idempotencyKey: 'rev-2-key' }),
    ).rejects.toMatchObject({ code: 'ALREADY_REVERSED' });
    expect(await balanceOf(a.id)).toBe(100n);
  });
});

describe('rekonsiliasi', () => {
  it('kosong jika saldo sama dengan jumlah ledger, dan mendeteksi saldo yang menyimpang', async () => {
    const a = await wallet('user-a');
    await fund(a.id, 100n);
    expect(await reconcile(pool)).toEqual([]);

    await pool.query('UPDATE accounts SET balance = balance + 1 WHERE id = $1', [a.id]);
    expect(await reconcile(pool)).toEqual([{ accountId: a.id, stored: 101n, computed: 100n }]);
  });
});
