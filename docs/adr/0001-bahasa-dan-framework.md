# ADR 0001: Bahasa dan framework: TypeScript, Node.js, Express

- Status: Diterima
- Tanggal: 2026-11-19

## Konteks

Semua service PayNusa ditulis oleh satu orang di sela jam kerja, jadi bahasa yang dipilih harus cepat dikuasai dan tidak memakan banyak waktu belajar.

## Keputusan

Semua service memakai **TypeScript** di atas **Node.js** dengan framework **Express**.

## Alasan

Ini bahasa dan framework yang paling cepat dikuasai pemilik proyek di kantor.

## Konsekuensi

- Satu bahasa untuk semua service, dan tipe statis membantu mencegah bug.
- Ekosistem pustaka luas untuk kebutuhan di roadmap (autentikasi, observability, klien NATS).
- Pemakaian memori lebih besar daripada Go. Perkiraan kasar 80 sampai 150 MB per service, yang perlu diperhitungkan saat memilih ukuran VPS.
- Express itu minimal. Validasi input, rate limiting, dan header keamanan harus ditambahkan sendiri lewat middleware.

## Alternatif yang dipertimbangkan

- **Go:** lebih ringan, tapi butuh waktu belajar.
- **Java/Spring:** lengkap, tapi paling berat di memori.
