# RACI PayNusa

- **Versi:** 1.0
- **Tanggal:** 20 November 2026
- **Status:** Disetujui
- **Dokumen terkait:** [Kebijakan Keamanan](security-policy.md)

Proyek ini dikerjakan sendirian, jadi satu orang memegang kelima peran. Peran tetap dipisahkan agar pembagian tanggung jawab jelas.

## Keterangan

- **R** (Responsible): mengerjakan.
- **A** (Accountable): satu orang yang bertanggung jawab akhir. Setiap baris punya tepat satu A.
- **C** (Consulted): dimintai masukan sebelum keputusan atau tindakan.
- **I** (Informed): diberi tahu setelahnya.
- **A/R**: peran yang sama mengerjakan dan bertanggung jawab.

Deskripsi peran ada di [Kebijakan Keamanan, bagian 1](security-policy.md#1-peran).

## Matriks

| Aktivitas | Business Owner | Security Lead | Engineering Lead | Operations Lead | Security Analyst |
|---|---|---|---|---|---|
| Menyetujui dan meninjau kebijakan | A | R | C | C | I |
| Menetapkan risk appetite | A/R | C | I | I | I |
| Memelihara risk register | I | A/R | C | C | C |
| Inventaris aset dan alur data | I | A | R | R | I |
| Menulis dan merilis kode (termasuk review) | I | C | A/R | C | I |
| Gerbang keamanan CI | I | A | R | C | I |
| Mengelola secret, kunci, dan akses istimewa | I | A | C | R | I |
| Memantau alert dan triase | I | A | I | C | R |
| Menangani insiden | I | A | C | R | R |
| Menyetujui pengecualian kebijakan | A | R | C | C | I |
| Backup dan uji pemulihan | I | C | C | A/R | I |
| Menilai risiko pihak ketiga | I | A | R | C | I |
| Melaporkan insiden besar ke pemilik | I | A/R | I | C | C |

## Riwayat Versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 2026-11-20 | Versi pertama, disetujui oleh Business Owner |
