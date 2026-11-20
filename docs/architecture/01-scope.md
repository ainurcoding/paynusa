# Scope dan profil perusahaan: PayNusa

> **Disclaimer:** PayNusa adalah perusahaan fiktif untuk proyek portofolio. Semua uang, pengguna, dan bank bersifat simulasi, dan semua data bersifat sintetis. Ini bukan layanan keuangan sungguhan.

Status: draf, diperbarui 2026-11-19.

## Perusahaan fiktif

| Atribut | Keterangan |
| --- | --- |
| Nama | PayNusa |
| Fungsi | Top-up, transfer antarpengguna, pembayaran, riwayat transaksi |
| Pengguna | Customer, Admin/operator, Security analyst |
| Pihak eksternal (semua simulasi) | Bank Simulator (bank fiktif "Bank Nusantara"), simulator penyedia Email/SMS |

## Scope

Scope-nya adalah API dompet digital dengan enam service plus sebuah bank fiktif kecil, dibangun untuk mendemonstrasikan kontrol NIST CSF, bukan fitur perbankan.

### Dalam scope

- Registrasi dan login dengan MFA dan passkeys
- Saldo wallet yang didukung ledger double-entry
- Top-up dan penarikan simulasi lewat Bank Simulator
- Transfer antarpengguna dan riwayat transaksi
- Notifikasi simulasi
- Audit log append-only dan aturan deteksi anomali
- Backup, restore, dan runbook respons insiden

### Di luar scope

- Koneksi ke bank atau payment gateway sungguhan: semuanya lewat Bank Simulator
- KYC sungguhan dengan dokumen identitas
- Kartu fisik dan aplikasi mobile (hanya API)
- Program kepatuhan regulasi (misalnya PCI DSS)
- Uang atau data pribadi sungguhan

### Asumsi

- Bank Simulator sengaja dibuat kecil: beberapa endpoint dan data palsu. Ia sekaligus menjadi contoh risiko pihak ketiga (lambat, mati, atau memberi respons aneh) untuk task Detect, Respond, dan Recover.
- Semuanya berjalan secara lokal (Docker Compose dulu, Kubernetes lokal kemudian).

## Keputusan teknologi

| Keputusan | Pilihan | ADR |
| --- | --- | --- |
| Bahasa dan framework | TypeScript, Node.js, Express | [0001](../adr/0001-bahasa-dan-framework.md) |
| Susunan repo | Monorepo | [0002](../adr/0002-monorepo.md) |
| Database | PostgreSQL | [0003](../adr/0003-database-postgresql.md) |
| Event bus | NATS | [0004](../adr/0004-event-bus-nats.md) |
| Alat diagram | Mermaid C4 di repo (cadangan: Structurizr DSL) | [0005](../adr/0005-diagram-mermaid-c4.md) |

## Pertanyaan terbuka

- ~~Satu schema atau satu database per service?~~ Diputuskan: satu instance, satu database per service ([ADR 0006](../adr/0006-database-per-service.md)).
- Apakah service saling memanggil langsung, atau hanya lewat event? Diusulkan: HTTP untuk yang mendesak, event untuk efek samping ([ADR 0007](../adr/0007-komunikasi-antar-service.md), menunggu persetujuan).
