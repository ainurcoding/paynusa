-- Wallet Service: skema ledger double-entry (lihat docs/architecture/03-ledger.md)
--
-- Konvensi: saldo akun = total CREDIT - total DEBIT.
-- Akun wallet tidak boleh minus; akun penampungan top-up boleh minus karena
-- mewakili uang yang sudah masuk dari bank.

CREATE TABLE accounts (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_ref      text        NOT NULL,
    type           text        NOT NULL
                   CHECK (type IN ('WALLET_USER', 'WALLET_MERCHANT', 'TOPUP_CLEARING', 'REVENUE')),
    currency       char(3)     NOT NULL DEFAULT 'IDR',
    status         text        NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
    balance        bigint      NOT NULL DEFAULT 0,
    allow_negative boolean     NOT NULL DEFAULT false,
    created_at     timestamptz NOT NULL DEFAULT now(),
    UNIQUE (owner_ref, type),
    CONSTRAINT balance_not_negative CHECK (allow_negative OR balance >= 0)
);

CREATE TABLE journal_entries (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    idempotency_key     text        NOT NULL UNIQUE,
    request_hash        text        NOT NULL,
    transaction_ref     text        NOT NULL,
    kind                text        NOT NULL
                        CHECK (kind IN ('TOPUP', 'TRANSFER', 'PAYMENT', 'REFUND', 'CORRECTION')),
    reverses_journal_id uuid REFERENCES journal_entries (id),
    created_at          timestamptz NOT NULL DEFAULT now()
);

-- Satu jurnal hanya boleh dibalik satu kali
CREATE UNIQUE INDEX one_reversal_per_journal
    ON journal_entries (reverses_journal_id)
    WHERE reverses_journal_id IS NOT NULL;

CREATE TABLE ledger_lines (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    journal_id uuid   NOT NULL REFERENCES journal_entries (id),
    account_id uuid   NOT NULL REFERENCES accounts (id),
    direction  text   NOT NULL CHECK (direction IN ('DEBIT', 'CREDIT')),
    amount     bigint NOT NULL CHECK (amount > 0)
);

CREATE INDEX ledger_lines_journal_idx ON ledger_lines (journal_id);
CREATE INDEX ledger_lines_account_idx ON ledger_lines (account_id);

-- Append-only: baris ledger dan jurnal tidak boleh diubah atau dihapus.
-- Kesalahan dikoreksi dengan jurnal baru (kind CORRECTION).
CREATE FUNCTION forbid_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'ledger bersifat append-only: % pada % ditolak', TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER journal_entries_append_only
    BEFORE UPDATE OR DELETE ON journal_entries
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

CREATE TRIGGER ledger_lines_append_only
    BEFORE UPDATE OR DELETE ON ledger_lines
    FOR EACH ROW EXECUTE FUNCTION forbid_mutation();

-- Lapisan kedua: database sendiri menolak jurnal yang tidak seimbang saat COMMIT,
-- walaupun aplikasi (atau seseorang lewat SQL langsung) lupa memeriksanya.
CREATE FUNCTION check_journal_balanced() RETURNS trigger AS $$
DECLARE
    total_debit  bigint;
    total_credit bigint;
BEGIN
    SELECT COALESCE(SUM(amount) FILTER (WHERE direction = 'DEBIT'), 0),
           COALESCE(SUM(amount) FILTER (WHERE direction = 'CREDIT'), 0)
      INTO total_debit, total_credit
      FROM ledger_lines
     WHERE journal_id = NEW.journal_id;

    IF total_debit <> total_credit THEN
        RAISE EXCEPTION 'jurnal % tidak seimbang (debit %, kredit %)',
            NEW.journal_id, total_debit, total_credit;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_lines_balanced
    AFTER INSERT ON ledger_lines
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION check_journal_balanced();
