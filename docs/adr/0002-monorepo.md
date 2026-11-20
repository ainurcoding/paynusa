# ADR 0002: Susunan repo: monorepo

- Status: Diterima
- Tanggal: 2026-11-19

## Konteks

PayNusa terdiri dari beberapa service, dokumentasi, dan diagram. Pembaca portofolio sebaiknya cukup membuka satu tempat.

## Keputusan

Semua kode, dokumentasi, dan konfigurasi disimpan dalam **satu repository (monorepo)**, dengan folder terpisah per service.

## Alasan

Satu pipeline CI, dan mudah ditelusuri pembaca.

## Konsekuensi

- Perubahan yang menyentuh beberapa service bisa masuk dalam satu commit.
- Dokumen dan diagram berada di tempat yang sama dengan kodenya.
- Seiring bertambahnya service, pipeline CI perlu dibuat agar hanya membangun bagian yang berubah.

## Alternatif yang dipertimbangkan

- **Polyrepo (satu repository per service):** cocok untuk tim besar yang masing-masing memegang service sendiri, tetapi berlebihan untuk proyek satu orang.
