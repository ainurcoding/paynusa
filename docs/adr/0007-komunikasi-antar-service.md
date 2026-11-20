# ADR 0007: Komunikasi antar service: HTTP untuk yang mendesak, event untuk efek samping

- Status: Diterima
- Tanggal: 2026-11-20

## Konteks

Service perlu saling berkomunikasi. Pertanyaan terbuka di [C4](../architecture/02-c4.md): service saling memanggil langsung atau hanya lewat event. Event bus sudah diputuskan di [ADR 0004](0004-event-bus-nats.md).

## Keputusan

- **HTTP (sinkron)** untuk permintaan yang membutuhkan jawaban saat itu juga dan memengaruhi konsistensi uang. Contoh: Transaction Service meminta Wallet Service memproses debit dan kredit.
- **Event lewat NATS (asinkron)** untuk efek samping yang tidak boleh menahan transaksi. Contoh: Notification Service dan Audit Service bereaksi setelah transaksi selesai.
- Wallet Service adalah satu-satunya pemilik ledger. Service lain tidak menulis ke ledger.

## Alasan

Konsistensi saldo harus dijamin pada satu titik dengan jawaban yang jelas (berhasil atau gagal). Notifikasi dan audit boleh terlambat sebentar, dan kegagalannya tidak boleh membatalkan transaksi.

## Konsekuensi

- Panggilan HTTP antar service wajib memakai idempotency key, timeout, dan mTLS.
- Event dikirim dengan pola outbox agar tidak hilang (dibahas di task terkait outbox).
- Ada dua jalur komunikasi yang harus dipahami dan diuji.

## Alternatif yang dipertimbangkan

- **Semua lewat event:** longgar, tetapi sulit menjamin konsistensi saldo dan menjawab pengguna secara langsung.
- **Semua lewat HTTP langsung:** sederhana, tetapi service saling bergantung dan satu service yang lambat menahan yang lain.
