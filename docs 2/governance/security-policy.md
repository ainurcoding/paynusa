# Kebijakan Keamanan PayNusa

- **Versi:** 1.0
- **Tanggal:** 20 November 2026
- **Status:** Disetujui
- **Pemilik / penyetuju:** Ainur (Business Owner)
- **Tinjauan berikutnya:** paling lambat 20 November 2027, atau lebih awal sesuai klausul 13
- **Dokumen terkait:** [RACI](raci.md), [Asset Inventory dan DFD](../security/asset-inventory-dfd.md), [Arsitektur C4](../architecture/02-c4.md)

> PayNusa adalah perusahaan fiktif untuk proyek portofolio. Semua uang, pengguna, dan bank bersifat simulasi, tetapi diperlakukan seolah-olah nyata.

Struktur dokumen ini mengikuti panduan kebijakan keamanan yang lazim (TechTarget, Compliancy Group) dan hasil yang diharapkan pada fungsi Govern di NIST CSF 2.0. Dokumen ini tidak meniru kebijakan perusahaan tertentu.

---

## 1. Peran

PayNusa punya lima peran dengan tanggung jawab dan wewenang yang jelas (maksud GV.RR-02). Proyek ini dikerjakan sendirian, sehingga satu orang memegang kelima peran. Peran tetap ditulis terpisah agar pemisahan tugas bisa dibahas.

| Peran | Tanggung jawab utama | Wewenang |
|---|---|---|
| Business Owner | Menyetujui kebijakan, menetapkan risk appetite, mengalokasikan sumber daya | Menerima atau menolak risiko residual, menyetujui pengecualian |
| Security Lead | Memiliki kebijakan dan program keamanan, memimpin manajemen risiko, mengawasi insiden | Menahan rilis yang melanggar kebijakan, mengaktifkan respons insiden |
| Engineering Lead | Membangun dan memelihara service sesuai kebijakan, code review, dependensi | Menyetujui perubahan kode ke produksi setelah lolos gerbang keamanan |
| Operations Lead | Infrastruktur, backup dan restore, secret, monitoring | Mengisolasi service dan mencabut akses saat insiden |
| Security Analyst | Memantau alert, triase, dan investigasi | Membekukan akun yang dicurigai diambil alih, sesuai runbook |

Pemetaan ke diagram C4: "Admin / operator" dijalankan oleh Operations Lead, dan "Security analyst" adalah peran Security Analyst. Customer adalah pengguna aplikasi, bukan peran organisasi.

## 2. Klasifikasi Data

Semua data dan aset dibagi dalam empat tingkat; perlakuannya makin ketat di tingkat yang lebih tinggi.

| Tingkat | Arti | Contoh di PayNusa | Perlakuan |
|---|---|---|---|
| Publik | Boleh dilihat siapa saja | README, diagram arsitektur, dokumentasi API publik | Tanpa pembatasan |
| Internal | Untuk tim, tidak disebarkan | Runbook, risk register, kode sumber, konfigurasi non-rahasia | Akses terbatas pada tim, tidak dipublikasikan |
| Rahasia | Kebocoran merugikan pengguna atau bisnis | Profil pengguna, saldo, riwayat transaksi, audit log | Dienkripsi saat disimpan dan dikirim, akses minimum, semua akses dicatat |
| Sangat rahasia | Kebocoran atau perubahan berakibat fatal | Kredensial, hash password, token, secret, kunci enkripsi, entri ledger (integritas) | Disimpan di Vault atau terenkripsi, tidak pernah masuk log atau repo, akses istimewa wajib MFA |

Kotak biru di diagram C4 Level 2 (Auth, Wallet, Transaction, PostgreSQL, Vault) menyimpan data tingkat Rahasia atau Sangat rahasia. Klasifikasi per aset ada di [Asset Inventory](../security/asset-inventory-dfd.md#6-asset-inventory-daftar-aset-awal).

## 3. Pernyataan Kebijakan

1. **Tujuan dan ruang lingkup.** Kebijakan ini melindungi kerahasiaan, integritas, dan ketersediaan seluruh aset PayNusa (kode, data simulasi, infrastruktur, secret, dan dokumentasi). Berlaku untuk semua peran di bagian Peran dan semua komponen di diagram C4, termasuk Bank Simulator.
2. **Prinsip.** Hak akses minimal (least privilege); pertahanan berlapis (defense in depth); aman sejak awal (secure by default); semua kejadian penting tercatat; kontrol dipilih berdasarkan risiko.
3. **Klasifikasi data.** Semua data dan aset diberi satu dari empat level (Publik, Internal, Rahasia, Sangat rahasia) dan diperlakukan sesuai tabel klasifikasi. Data tanpa label dianggap Rahasia sampai diklasifikasikan.
4. **Kontrol akses.** Akses diberikan per peran dan hanya sebesar yang dibutuhkan. Setiap akun punya identitas sendiri (tanpa akun bersama). Akun admin dan akun istimewa wajib memakai MFA. Akses ditinjau setiap 6 bulan dan dicabut saat tidak dibutuhkan lagi.
5. **Kriptografi dan secret.** Data Rahasia dan Sangat rahasia dienkripsi saat disimpan dan saat dikirim (TLS, mTLS antar service). Secret dan kunci disimpan di Vault/OpenBao, tidak pernah di kode, repo, atau log. Secret yang bocor langsung diganti.
6. **Pengembangan aman.** Perubahan kode melalui review sebelum digabung. Pipeline CI menjalankan pemeriksaan keamanan (analisis kode statis, pemindaian dependensi, pemindaian image) dan perubahan gagal digabung jika ada temuan kritis yang belum ditangani.
7. **Logging dan pemantauan.** Aktivitas penting (login, perubahan akses, transaksi, perubahan konfigurasi) dicatat di audit log append-only yang tidak dapat diubah oleh service yang menulisnya. Audit log disimpan selama 1 tahun. Ada baseline perilaku normal dan alert untuk penyimpangan.
8. **Manajemen insiden.** Dugaan insiden segera dilaporkan ke Security Lead. Insiden ditangani mengikuti runbook, dan setiap insiden berakhir dengan laporan pasca-insiden berisi penyebab, dampak, dan perbaikan.
9. **Backup dan pemulihan.** Backup dibuat terjadwal, dienkripsi, dan diuji pemulihannya secara berkala. Setelah pemulihan, ledger direkonsiliasi dengan saldo wallet.
10. **Pihak ketiga.** Setiap layanan atau komponen eksternal (termasuk library dan penyedia simulasi) dicatat dan dinilai risikonya sebelum dipakai. Gangguan dari pihak ketiga disimulasikan agar dampaknya diketahui.
11. **Data sintetis dan privasi.** Hanya data sintetis yang boleh ada di repo, lingkungan uji, dan layanan eksternal (termasuk alat AI). Dilarang memasukkan data pribadi sungguhan atau uang sungguhan ke sistem ini.
12. **Pengecualian dan pelanggaran.** Pengecualian terhadap kebijakan harus tertulis, berbatas waktu, dan disetujui Business Owner berdasarkan rekomendasi Security Lead. Pelanggaran dicatat sebagai insiden dan diperbaiki.
13. **Tinjauan.** Kebijakan ditinjau minimal setahun sekali, dan juga setelah insiden besar, perubahan teknologi besar, atau perubahan regulasi. Hasil tinjauan dicatat sebagai versi baru.

## 4. Risk Appetite

PayNusa tidak menerima risiko terhadap kerahasiaan kredensial dan integritas ledger. Risiko ketersediaan jangka pendek dapat diterima selama data tidak hilang dan pemulihan teruji.

## 5. Keputusan yang Ditetapkan

| # | Keputusan | Nilai |
|---|---|---|
| 1 | MFA wajib untuk akun admin dan akun istimewa | Ya |
| 2 | Tinjauan hak akses | Setiap 6 bulan |
| 3 | Retensi audit log | 1 tahun |
| 4 | Kelima peran dipegang satu orang | Ya, peran dipisahkan di dokumen |

Tinjauan kebijakan minimal setahun sekali dan empat level klasifikasi berasal dari panduan yang ditiru, bukan asumsi.

## Lampiran A: Pemetaan ke NIST CSF 2.0 (Govern)

Rumusan hasil diparafrasekan, bukan kutipan resmi. Cocokkan dengan dokumen resmi NIST sebelum dipakai sebagai klaim.

| ID | Hasil yang diharapkan (ringkas) | Dipenuhi oleh | Status |
|---|---|---|---|
| GV.PO-01 | Kebijakan manajemen risiko keamanan dibuat dan dikomunikasikan | Dokumen ini, bagian 3 | Terpenuhi |
| GV.PO-02 | Kebijakan ditinjau dan diperbarui berkala | Klausul 13 (minimal setahun sekali) | Terpenuhi |
| GV.RR-01 | Pimpinan bertanggung jawab atas risiko keamanan | Peran Business Owner | Terpenuhi |
| GV.RR-02 | Peran dan tanggung jawab ditetapkan dan dikomunikasikan | Bagian 1 dan [RACI](raci.md) | Terpenuhi |
| GV.RR-03 | Sumber daya sesuai dengan strategi risiko | Sebagian: sumber dayanya hanya waktu pemilik | Sebagian |
| GV.RR-04 | Keamanan masuk ke praktik SDM | Di luar lingkup: tidak ada karyawan | Tidak berlaku |
| GV.RM-02 | Risk appetite ditetapkan dan dikomunikasikan | Bagian 4 | Terpenuhi |
| GV.SC-04 | Pemasok dikenali dan diprioritaskan menurut kritikalitas | Klausul 10 | Terpenuhi |
| GV.SC-07 | Risiko pemasok dinilai, dicatat, dan dipantau | Klausul 10 dan RACI "Menilai risiko pihak ketiga" | Terpenuhi |

Sumber: [Cyber Compliance Watch](https://cybercompliancewatch.org/guideline/nist-csf-2-0-subcategories/), [Cloudaware](https://ce.prod.cloudaware.com/frameworks/nist-csf-v2.0/gv-rr/), [TechTarget](https://www.techtarget.com/cybersecurity/tip/How-to-write-an-information-security-policy-plus-templates), [Compliancy Group](https://compliancy-group.com/information-security-policy-complete-guide-examples-free-template/).

## Riwayat Versi

| Versi | Tanggal | Perubahan |
|---|---|---|
| 1.0 | 2026-11-20 | Versi pertama, disetujui oleh Business Owner |
