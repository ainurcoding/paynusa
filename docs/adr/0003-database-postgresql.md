# ADR 0003: Database: PostgreSQL

- Status: Diterima
- Tanggal: 2026-11-19

## Konteks

Dompet digital membutuhkan ledger yang konsisten. Setiap transfer harus mengurangi saldo satu pihak dan menambah saldo pihak lain dalam satu kesatuan, atau tidak terjadi sama sekali.

## Keputusan

Data disimpan di **PostgreSQL**.

## Alasan

Transaksi untuk ledger, dan point-in-time recovery untuk skenario pemulihan di task 31.

## Konsekuensi

- Transaksi ACID mendukung pencatatan double-entry yang konsisten.
- Point-in-time recovery memungkinkan latihan restore pada task 31 dan 32.
- Pertanyaan yang masih terbuka: **satu instance dengan schema per service**, atau **satu database per service**. Opsi kedua lebih terisolasi tetapi memakai lebih banyak sumber daya.

## Alternatif yang dipertimbangkan

- **MySQL:** sama-sama relasional, tetapi PostgreSQL dipilih untuk fitur recovery dan kebutuhan ledger.
- **MongoDB:** model dokumen kurang cocok untuk ledger yang menuntut transaksi lintas catatan.
