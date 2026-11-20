# ADR 0004: Event bus: NATS

- Status: Diterima
- Tanggal: 2026-11-19

## Konteks

Service perlu saling mengirim kabar tanpa memanggil satu sama lain secara langsung. Contohnya, setelah transfer selesai, Notification Service dan Audit Service perlu mengetahuinya. Pola outbox di task 13 juga membutuhkan event bus.

## Keputusan

Event bus memakai **NATS**.

## Alasan

NATS lebih ringan dijalankan secara lokal.

## Konsekuensi

- Cocok untuk Docker Compose dan VPS dengan memori terbatas.
- Perlu memakai fitur persistensi NATS (JetStream) agar pesan tidak hilang saat konsumen sedang mati. Detailnya diputuskan di task 13.
- Pengenalan di industri lebih kecil dibanding Kafka, tetapi konsep publish/subscribe-nya sama.

## Alternatif yang dipertimbangkan

- **Kafka:** lebih dikenal di industri, tetapi jauh lebih berat untuk dijalankan secara lokal.
- **RabbitMQ:** serbaguna, tetapi tidak dipilih untuk menjaga jumlah teknologi tetap sedikit.
