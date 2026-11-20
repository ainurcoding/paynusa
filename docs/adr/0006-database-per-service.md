# ADR 0006: Satu instance PostgreSQL, satu database per service

- Status: Diterima
- Tanggal: 2026-11-20

## Konteks

Service PayNusa perlu penyimpanan data yang batasnya jelas. Pertanyaan terbuka dari [scope](../architecture/01-scope.md) dan [C4](../architecture/02-c4.md): satu database dengan schema per service, atau database per service. Lingkungan development sudah punya PostgreSQL yang berjalan di Podman, dan VPS target memiliki memori terbatas.

## Keputusan

Satu instance PostgreSQL berisi **satu database per service** (misalnya `auth_db`, `wallet_db`, `transaction_db`, `audit_db`). Setiap service punya user database sendiri yang hanya bisa mengakses database miliknya.

## Alasan

- PostgreSQL tidak mendukung query lintas database, jadi service tidak bisa membaca data service lain. Isolasi ini lebih tegas daripada schema, yang baru terblokir jika hak akses diatur ketat.
- Tetap satu proses, sehingga hemat memori di VPS kecil dan backup cukup satu.
- Sejalan dengan [kebijakan keamanan](../governance/security-policy.md): hak akses minimal dan data Rahasia terpisah.

## Konsekuensi

- Tidak ada foreign key atau join lintas service. Data service lain diakses lewat API atau event ([ADR 0007](0007-komunikasi-antar-service.md)).
- Setiap service punya migrasi dan kredensial sendiri. Kredensial disimpan di Vault/OpenBao, bukan di kode.
- Satu instance berarti satu titik kegagalan dan backup harus mencakup semua database. Dapat dipecah menjadi beberapa instance kelak tanpa mengubah kode service.

## Alternatif yang dipertimbangkan

- **Satu database dengan schema per service:** paling sederhana, tetapi isolasi bergantung pada pengaturan hak akses.
- **Satu instance per service:** isolasi paling kuat, tetapi tiap instance memakai memori sendiri dan operasinya berat untuk proyek solo di VPS kecil.
