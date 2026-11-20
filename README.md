# PayNusa

Dompet digital fiktif untuk proyek portofolio berbasis NIST CSF. Semua uang, pengguna, dan bank bersifat simulasi.

Dokumentasi lengkap ada di [docs/](docs/README.md).

## Struktur

```
docs/                  Arsitektur, kebijakan, RACI, ADR
infra/postgres/        Skrip membuat database dan user per service
services/wallet/       Wallet Service: ledger double-entry
compose.yaml           NATS (dan PostgreSQL opsional) lewat Podman
```

## Menjalankan di lokal (Windows PowerShell, Podman)

Prasyarat: Node.js 22 atau lebih baru, Podman, dan container `paynusa-postgres` (PostgreSQL 16.6) yang sudah berjalan.

1. **Buat database dan user per service** (password acak, tampil sekali):

   ```powershell
   powershell -File infra/postgres/setup.ps1
   ```

2. **Isi `.env` Wallet Service.** Salin `services/wallet/.env.example` menjadi `services/wallet/.env`, lalu isi `DATABASE_URL` dan `TEST_DATABASE_URL` dengan baris yang dicetak langkah 1. File `.env` tidak boleh masuk repo.

3. **Pasang dependensi lalu jalankan migrasi dan tes:**

   ```powershell
   npm install
   npm run migrate -w services/wallet
   npm test -w services/wallet
   npm run typecheck -w services/wallet
   ```

   Setelah `npm install` pertama, commit `package-lock.json` (CI memakai `npm ci`).

4. **Jalankan service (opsional):**

   ```powershell
   npm run dev -w services/wallet
   ```

5. **NATS (belum dipakai Wallet Service, untuk tahap berikutnya):**

   ```powershell
   podman compose up -d
   ```

## Catatan keamanan

- API Wallet Service bersifat internal dan belum punya autentikasi antar service. Service hanya mendengarkan `127.0.0.1`. Jangan diekspos ke jaringan sampai mTLS dan autentikasi ditambahkan.
- Tes menghapus semua data di `wallet_test_db`. Jangan arahkan `TEST_DATABASE_URL` ke database yang berisi data lain.
- Pemilik database (user service) masih bisa menghapus trigger append-only. Pemisahan user migrasi dan user aplikasi dengan hak lebih kecil adalah pekerjaan berikutnya.
