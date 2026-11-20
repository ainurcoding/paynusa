# Model Ledger PayNusa

- **Status:** Diterima
- **Tanggal:** 2026-11-20
- **Pemilik data:** Wallet Service (database `wallet_db`, lihat [ADR 0006](../adr/0006-database-per-service.md))

Ledger adalah catatan resmi perpindahan nilai. Klasifikasinya Sangat rahasia (integritas kritis), lihat [Asset Inventory](../security/asset-inventory-dfd.md).

## Aturan dasar

1. **Double-entry.** Setiap jurnal terdiri dari dua baris atau lebih. Total debit sama dengan total kredit di setiap jurnal.
2. **Uang berupa bilangan bulat** dalam satuan terkecil mata uang simulasi. Tidak pernah float.
3. **Append-only.** Entri tidak diubah atau dihapus. Kesalahan dikoreksi dengan jurnal baru yang membalik entri lama dan menautkannya.
4. **Idempotent.** Setiap jurnal punya idempotency key unik. Permintaan yang sama dua kali menghasilkan satu jurnal.
5. **Atomik.** Jurnal, baris ledger, dan pembaruan saldo ditulis dalam satu transaksi database.
6. **Saldo adalah turunan.** Saldo wallet harus sama dengan jumlah baris ledger. Pekerjaan rekonsiliasi memeriksanya secara berkala.

## Tabel

| Tabel | Isi utama |
|---|---|
| `accounts` | `id`, `owner_ref`, `type` (wallet pengguna, wallet merchant, penampungan top-up, pendapatan), `currency`, `status`, `balance` (cache turunan), `created_at` |
| `journal_entries` | `id`, `idempotency_key` (unik), `request_hash` (mendeteksi key dipakai ulang dengan isi berbeda), `transaction_ref`, `kind` (top-up, transfer, pembayaran, refund, koreksi), `reverses_journal_id` (opsional), `created_at` |
| `ledger_lines` | `id`, `journal_id`, `account_id`, `direction` (debit atau kredit), `amount` (bilangan bulat, lebih dari 0) |

Pembatasan di database: `amount > 0`, `idempotency_key` unik, satu jurnal hanya bisa dibalik sekali, trigger yang menolak `UPDATE` dan `DELETE` pada `journal_entries` dan `ledger_lines`, dan trigger yang menolak jurnal tidak seimbang saat COMMIT. Implementasinya ada di `services/wallet/migrations/001_init.sql`.

## Contoh

Customer top-up 100.000:

| Jurnal | Akun | Debit | Kredit |
|---|---|---|---|
| J1 (top-up) | Penampungan top-up | 100.000 | |
| J1 (top-up) | Wallet customer | | 100.000 |

Transfer 30.000 dari A ke B:

| Jurnal | Akun | Debit | Kredit |
|---|---|---|---|
| J2 (transfer) | Wallet A | 30.000 | |
| J2 (transfer) | Wallet B | | 30.000 |

Konvensi yang dipakai: **saldo akun = total kredit - total debit**. Akun wallet tidak boleh minus. Akun penampungan top-up boleh minus karena mewakili uang yang sudah masuk dari bank (pada contoh di atas saldonya -100.000).

## Yang harus lolos tes

- Jurnal tidak seimbang ditolak.
- Permintaan duplikat (idempotency key sama) tidak membuat jurnal kedua.
- Gagal di tengah jurnal tidak meninggalkan sebagian baris (atomik).
- Saldo tidak boleh minus kecuali tipe akun mengizinkannya.
- Dua transfer bersamaan dari wallet yang sama tidak membuat saldo minus (penguncian baris).
- `UPDATE` dan `DELETE` pada ledger ditolak.
- Rekonsiliasi mendeteksi saldo yang tidak sama dengan jumlah ledger.

## Pertanyaan terbuka

- Aturan refund (penuh atau sebagian) dan batas waktunya.
- Pencatatan biaya layanan, jika ada.
