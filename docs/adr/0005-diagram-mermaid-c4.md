# ADR 0005: Alat diagram: Mermaid C4 di repo

- Status: Diterima
- Tanggal: 2026-11-19

## Konteks

Diagram arsitektur harus mudah dibuat, mudah diperbarui, dan terlihat langsung oleh pembaca repo.

## Keputusan

Diagram C4 ditulis sebagai **Mermaid** di file Markdown dalam repo. Levelnya mengikuti model C4 (Context dan Container), digambar dengan flowchart Mermaid yang bergaya C4.

## Alasan

Tampil langsung di GitHub, dan perubahannya mudah dibandingkan di Git.

## Konsekuensi

- Diagram berupa teks, jadi ikut ter-versi bersama kode dan bisa ditinjau seperti kode.
- **Hasil pengujian (2026-11-19):** sintaks C4 bawaan Mermaid (`C4Context`, `C4Container`) bisa dirender, tetapi tata letaknya otomatis dan tidak bisa diatur. Pada diagram container, panah menembus kotak dan label saling menimpa, dan pengaturan `UpdateLayoutConfig` tidak mengubah hasil pada diagram konteks. Karena itu diagram memakai flowchart Mermaid dengan `subgraph` dan `classDef`, yang hasilnya jauh lebih rapi.
- Isi dan level C4-nya tetap sama, hanya sintaks penulisannya yang berbeda dari sintaks C4 bawaan.
- Tata letak tetap diatur otomatis, jadi diagram yang makin padat bisa menjadi kurang rapi.

## Cadangan

Jika diagram makin kompleks (misalnya saat Level 3 dibuat) dan Mermaid tidak lagi memadai, gunakan **Structurizr DSL**, yang dibuat khusus untuk C4.

## Alternatif yang dipertimbangkan

- **Sintaks C4 bawaan Mermaid:** diuji dan tidak dipakai karena tata letaknya, lihat di atas.
- **draw.io:** cepat digambar manual, tetapi perubahannya sulit dilacak di Git.
