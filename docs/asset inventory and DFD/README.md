# Paynusa --- Asset Inventory & Data Flow Diagram (DFD)

**Dokumen:** R&D Blueprint\
**Status:** Baseline awal\
**Versi:** 1.0\
**Tanggal:** 19 November 2026\
**Pemilik:** Ainur\
**Produk:** Paynusa\
**Klasifikasi:** Internal --- Portfolio Simulation

------------------------------------------------------------------------

## 1. Tujuan Dokumen

Dokumen ini menjadi blueprint awal untuk mengidentifikasi aset, batas
sistem, aktor, dan aliran data pada proyek Paynusa.

Dokumen ini dibuat sebelum implementasi teknis agar keputusan
arsitektur, keamanan, dan pengembangan memiliki dasar yang jelas.

## 2. Business Model yang Dikunci

Paynusa adalah **Digital Wallet & Payment Platform** dengan identitas:

> A Digital Wallet and Payment Infrastructure Platform.

Paynusa merupakan platform utama yang menyediakan:

1.  **Digital Wallet** --- registrasi pengguna, pengelolaan wallet dan
    saldo, top-up, serta transfer.
2.  **Payment Services** --- pembayaran ke merchant dan refund.
3.  **Payment Integration** --- integrasi API dengan bank atau payment
    provider, webhook, dan reconciliation.

### 2.1 Sistem Pendukung: Bank Fiktif

Bank Fiktif adalah sistem terpisah yang dibangun untuk simulasi dan
berfungsi sebagai perantara top-up.

Cakupan Bank Fiktif: - Mengelola data rekening simulasi. - Mengelola
saldo rekening simulasi. - Memproses debit rekening sumber dan kredit
rekening penampungan Paynusa untuk simulasi top-up. - Mengirimkan status
transaksi kepada Paynusa melalui API atau webhook.

Bank Fiktif **bukan** simulasi bank penuh dan tidak mencakup seluruh
layanan perbankan.

### 2.2 Batasan Proyek

-   Seluruh transaksi menggunakan uang dan saldo simulasi.
-   Tidak menerima, menyimpan, atau memindahkan uang sungguhan.
-   Tidak mengoperasikan layanan uang elektronik atau pembayaran riil.
-   Bank Fiktif hanya mendukung kebutuhan simulasi top-up pada tahap
    awal.
-   Implementasi dilakukan bertahap; daftar layanan di bawah adalah peta
    tanggung jawab konseptual, bukan kewajiban membuat setiap layanan
    sebagai microservice sejak hari pertama.

**Keputusan bisnis dan batasan di atas merupakan baseline proyek.
Perubahan hanya dilakukan jika pemilik proyek secara eksplisit membuka
kembali keputusan tersebut.**

------------------------------------------------------------------------

## 3. Aktor dan Pihak Eksternal

  -----------------------------------------------------------------------
  Aktor / Pihak           Peran                   Interaksi utama
  ----------------------- ----------------------- -----------------------
  Customer                Pengguna Paynusa        Registrasi, melihat
                                                  saldo, top-up,
                                                  transfer, dan membayar

  Merchant                Penerima pembayaran     Membuat atau menerima
                                                  permintaan pembayaran,
                                                  melihat status
                                                  transaksi

  Paynusa                 Platform inti           Mengelola wallet,
                                                  transaksi, ledger,
                                                  pembayaran, dan
                                                  integrasi

  Bank Fiktif             Sistem eksternal        Memproses top-up dari
                          simulasi                rekening simulasi dan
                                                  mengirim status

  Admin / Operator        Pengelola operasional   Memantau sistem dan
                          simulasi                menangani aktivitas
                                                  administratif sesuai
                                                  hak akses
  -----------------------------------------------------------------------

Catatan: Merchant dan Admin/Operator adalah aktor konseptual. Detail
portal, aplikasi, serta hak aksesnya ditetapkan pada desain berikutnya.

------------------------------------------------------------------------

## 4. Batas Sistem (System Boundary)

### 4.1 Di Dalam Batas Paynusa

-   User Management
-   Authentication & Authorization
-   Wallet Management
-   Payment Processing
-   Transaction Management
-   Ledger
-   Merchant Management
-   Payment Integration
-   Notification
-   Reconciliation

Komponen tersebut menunjukkan domain/tanggung jawab logis. Pemisahan
menjadi service, database, atau deployment unit akan ditentukan melalui
desain arsitektur.

### 4.2 Di Luar Batas Paynusa

-   Customer dan perangkat yang digunakan.
-   Merchant dan sistem merchant.
-   Bank Fiktif beserta database dan API miliknya.
-   Payment provider lain yang mungkin diintegrasikan pada tahap
    berikutnya.

### 4.3 Prinsip Pemisahan Bank Fiktif

Bank Fiktif harus diperlakukan sebagai sistem eksternal walaupun
dikembangkan oleh orang yang sama. Karena itu: - Bank Fiktif memiliki
batas sistem, API, dan penyimpanan datanya sendiri. - Paynusa tidak
membaca atau mengubah database Bank Fiktif secara langsung. - Komunikasi
dilakukan melalui kontrak API atau webhook yang terdokumentasi. - Setiap
permintaan dan notifikasi harus dapat dikorelasikan menggunakan
referensi transaksi.

------------------------------------------------------------------------

## 5. Gambaran Proses Bisnis Utama

### 5.1 Top-up Wallet

1.  Customer memilih top-up dan memasukkan nominal.
2.  Paynusa membuat transaksi top-up dengan status awal, misalnya
    `PENDING`.
3.  Paynusa mengirim permintaan pembayaran ke Bank Fiktif.
4.  Bank Fiktif memvalidasi rekening sumber dan kecukupan saldo
    simulasi.
5.  Bank Fiktif memproses transaksi pada pembukuannya sendiri.
6.  Bank Fiktif mengirim hasil transaksi ke Paynusa melalui respons API
    dan/atau webhook.
7.  Paynusa memvalidasi keaslian, referensi, nominal, dan status
    notifikasi.
8.  Jika valid dan berhasil, Paynusa mencatat jurnal ledger dan menambah
    saldo wallet secara konsisten.
9.  Paynusa mengubah status transaksi dan memberi notifikasi kepada
    Customer.

**Kontrol penting:** Saldo wallet tidak boleh bertambah hanya karena
Customer mengirim permintaan top-up. Penambahan saldo dilakukan setelah
konfirmasi yang valid dan pemrosesan yang aman.

### 5.2 Pembayaran ke Merchant Menggunakan Wallet

1.  Customer memulai pembayaran kepada Merchant.
2.  Paynusa memvalidasi identitas, otorisasi, status wallet, dan saldo
    tersedia.
3.  Paynusa membuat transaksi dengan referensi unik.
4.  Paynusa mencatat perpindahan nilai pada ledger secara konsisten.
5.  Saldo Customer berkurang dan kewajiban/hasil penerimaan Merchant
    dicatat sesuai model ledger.
6.  Paynusa mengirim status pembayaran kepada Customer dan Merchant.

### 5.3 Transfer Antar Pengguna

1.  Pengirim memasukkan penerima dan nominal.
2.  Paynusa memvalidasi pengirim, penerima, status wallet, dan saldo.
3.  Paynusa memproses debit dan kredit sebagai satu transaksi yang
    konsisten.
4.  Paynusa menyimpan jejak audit dan mengirim notifikasi kepada kedua
    pihak.

### 5.4 Refund

1.  Refund diajukan terhadap transaksi pembayaran yang sudah ada.
2.  Paynusa memeriksa status transaksi dan kelayakan refund.
3.  Paynusa memastikan refund tidak diproses lebih dari sekali.
4.  Paynusa membuat transaksi refund baru yang terhubung ke transaksi
    asal.
5.  Ledger diperbarui dan status diinformasikan kepada pihak terkait.

------------------------------------------------------------------------

## 6. Asset Inventory --- Daftar Aset Awal

Asset Inventory adalah daftar aset yang perlu dilindungi, dikelola, dan
dipantau. Daftar berikut adalah **inventaris kandidat awal**; detail
aktual seperti nama host, lokasi, pemilik teknis, klasifikasi final, dan
kontrol yang diterapkan harus diperbarui saat implementasi.

  -----------------------------------------------------------------------------------------------
  ID          Aset              Kategori         Data / fungsi     Pemilik       Sensitivitas
                                                                   fungsi        awal
  ----------- ----------------- ---------------- ----------------- ------------- ----------------
  AST-001     Customer Profile  Data             Identitas dan     Paynusa       Tinggi
              Data                               profil pengguna                 

  AST-002     Authentication    Data / Security  Kredensial, hash  Paynusa       Sangat tinggi
              Data                               password, sesi,                 
                                                 token                           

  AST-003     Wallet Records    Data             Akun wallet dan   Paynusa       Tinggi
                                                 status wallet                   

  AST-004     Wallet Balance    Data Keuangan    Saldo simulasi    Paynusa       Tinggi
                                                 pengguna                        

  AST-005     Transaction       Data Keuangan    Top-up,           Paynusa       Tinggi
              Records                            pembayaran,                     
                                                 transfer, refund                

  AST-006     Ledger Entries    Data Keuangan    Catatan           Paynusa       Sangat tinggi
                                                 debit/kredit dan                
                                                 referensi                       
                                                 transaksi                       

  AST-007     Merchant Records  Data             Profil merchant   Paynusa       Sedang--Tinggi
                                                 dan konfigurasi                 

  AST-008     Payment           Secret           API key, webhook  Paynusa       Sangat tinggi
              Integration                        secret,                         
              Credentials                        kredensial                      
                                                 integrasi                       

  AST-009     Bank Account      Data             Rekening simulasi Bank Fiktif   Tinggi
              Records                            pada Bank Fiktif                

  AST-010     Bank Transaction  Data Keuangan    Debit/kredit dan  Bank Fiktif   Tinggi
              Records                            status transaksi                
                                                 bank simulasi                   

  AST-011     Application       Software         Kode sumber       Engineering   Sedang
              Source Code                        Paynusa dan Bank                
                                                 Fiktif                          

  AST-012     Application       Configuration    Environment dan   Engineering / Tinggi
              Configuration                      konfigurasi       Operations    
                                                 aplikasi                        

  AST-013     Database Systems  Infrastructure   Penyimpanan data  Operations    Tinggi
                                                 aplikasi                        

  AST-014     Application/API   Software /       Endpoint dan      Engineering / Tinggi
              Services          Infrastructure   proses bisnis     Operations    

  AST-015     Logs and Audit    Data Operasional Aktivitas sistem, Operations /  Tinggi
              Trails                             keamanan, dan     Security      
                                                 perubahan                       

  AST-016     Backup and        Data /           Salinan pemulihan Operations    Tinggi
              Recovery Copies   Infrastructure   data                            

  AST-017     Deployment        Software /       Build, test, dan  Operations    Sedang--Tinggi
              Pipeline          Process          deployment                      

  AST-018     SSH Keys and      Secret           Akses server dan  Operations /  Sangat tinggi
              Signing Secrets                    penandatanganan   Security      
  -----------------------------------------------------------------------------------------------

### 6.1 Klasifikasi Sensitivitas

-   **Sangat tinggi:** kebocoran atau penyalahgunaan dapat menyebabkan
    pengambilalihan akses, manipulasi transaksi, atau kompromi sistem.
-   **Tinggi:** data transaksi, identitas, saldo, dan operasional yang
    perlu akses terbatas.
-   **Sedang--Tinggi:** aset internal yang dapat membuka informasi
    arsitektur atau memengaruhi operasional jika disalahgunakan.
-   **Sedang:** aset internal yang tetap perlu perlindungan, tetapi
    dampak langsungnya relatif lebih terbatas.

Klasifikasi ini adalah penilaian awal untuk simulasi. Validasi ulang
setelah data dan implementasi nyata diketahui.

------------------------------------------------------------------------

## 7. Data Flow Diagram (DFD)

### 7.1 DFD Level 0 --- Context Diagram

Pada level ini, Paynusa dipandang sebagai satu proses utama.

``` mermaid
flowchart LR
    C[Customer] -->|Registrasi, top-up, pembayaran, transfer| P((Paynusa Platform))
    P -->|Saldo, status transaksi, notifikasi| C

    M[Merchant] -->|Permintaan pembayaran, status pesanan| P
    P -->|Status pembayaran, informasi transaksi| M

    P -->|Permintaan proses top-up| B[Bank Fiktif]
    B -->|Status dan referensi transaksi| P

    A[Admin / Operator] -->|Operasional dan pemantauan| P
    P -->|Log, status, laporan operasional| A
```

### 7.2 DFD Level 1 --- Proses Top-up

``` mermaid
flowchart TD
    C[Customer]
    P1((1. Create Top-up))
    P2((2. Process Bank Payment))
    P3((3. Validate Confirmation))
    P4((4. Post Ledger and Update Wallet))
    B[Bank Fiktif]
    D1[(Top-up / Transaction Store)]
    D2[(Wallet Store)]
    D3[(Ledger Store)]

    C -->|Nominal dan metode top-up| P1
    P1 -->|Simpan transaksi PENDING| D1
    P1 -->|Instruksi pembayaran| B
    B -->|Hasil pembayaran / webhook| P3
    P3 -->|Baca referensi dan status| D1
    P3 -->|Jika valid dan berhasil| P4
    P4 -->|Catatan debit/kredit| D3
    P4 -->|Saldo wallet diperbarui| D2
    P4 -->|Status transaksi final| D1
    D1 -->|Status top-up| C
    D2 -->|Saldo terbaru| C
```

Diagram ini menggambarkan alur logis, bukan urutan teknis final.
Implementasi perlu menangani notifikasi duplikat, timeout, retry,
transaksi yang terlambat, dan kegagalan parsial.

### 7.3 DFD Level 1 --- Pembayaran Merchant

``` mermaid
flowchart TD
    C[Customer]
    M[Merchant]
    P1((1. Create Payment))
    P2((2. Validate Wallet))
    P3((3. Post Payment))
    P4((4. Notify Parties))
    D1[(Wallet Store)]
    D2[(Transaction Store)]
    D3[(Ledger Store)]

    M -->|Permintaan pembayaran / invoice| P1
    C -->|Persetujuan pembayaran| P1
    P1 -->|Buat transaksi| D2
    P1 --> P2
    P2 <-->|Periksa status dan saldo| D1
    P2 -->|Validasi berhasil| P3
    P3 -->|Catat perpindahan nilai| D3
    P3 -->|Perbarui saldo/status| D1
    P3 -->|Status transaksi| D2
    P3 --> P4
    P4 -->|Hasil pembayaran| C
    P4 -->|Hasil pembayaran| M
```

### 7.4 Catatan DFD

-   Panah menunjukkan perpindahan data, bukan selalu perpindahan uang.
-   Data store menunjukkan penyimpanan logis; belum menetapkan teknologi
    database.
-   Bank Fiktif merupakan entitas eksternal terhadap Paynusa.
-   Diagram perlu diperinci ketika kontrak API, service boundary, dan
    struktur data telah dirancang.

------------------------------------------------------------------------

## 8. Batas Kepercayaan dan Kontrol Keamanan Awal

Area berikut perlu diperhatikan saat DFD dikembangkan:

  -----------------------------------------------------------------------
  Area                    Risiko yang perlu       Kontrol awal
                          dipertimbangkan         
  ----------------------- ----------------------- -----------------------
  Customer → Paynusa      Akses tidak sah dan     Authentication,
                          penyalahgunaan akun     authorization, rate
                                                  limiting

  Paynusa → Bank Fiktif   Permintaan palsu atau   API authentication,
                          manipulasi nominal      request signing, TLS

  Bank Fiktif → Paynusa   Webhook palsu atau      Signature verification,
                          duplikat                idempotency, replay
                                                  protection

  Payment → Ledger        Saldo ganda atau        Atomic transaction,
                          pencatatan tidak        immutable journal,
                          konsisten               audit trail

  Admin → Sistem          Penyalahgunaan hak      Least privilege, MFA,
                          istimewa                audit logging

  Aplikasi → Database     Kebocoran atau akses    Network restriction,
                          data berlebihan         access control, secret
                                                  management

  Backup dan log          Kebocoran data sensitif Access restriction,
                                                  encryption, retention
                                                  policy
  -----------------------------------------------------------------------

Kontrol di atas adalah kebutuhan desain awal, bukan pernyataan bahwa
seluruh kontrol sudah diimplementasikan.

------------------------------------------------------------------------

## 9. Risiko dan Skenario Kegagalan yang Harus Ditangani

1.  **Duplicate request:** permintaan top-up atau pembayaran terkirim
    lebih dari sekali.
2.  **Duplicate webhook:** notifikasi transaksi yang sama diterima
    berulang kali.
3.  **Timeout:** Paynusa tidak menerima respons, padahal Bank Fiktif
    sudah memproses transaksi.
4.  **Invalid callback:** notifikasi berasal dari pihak yang tidak sah
    atau payload telah dimanipulasi.
5.  **Partial failure:** satu sistem berhasil memproses, sedangkan
    sistem lain gagal memperbarui status.
6.  **Ledger mismatch:** saldo wallet tidak sesuai dengan total catatan
    ledger.
7.  **Unauthorized access:** pengguna atau operator mengakses data di
    luar kewenangannya.

Prinsip penanganan: - Gunakan ID transaksi dan idempotency key yang
konsisten. - Jangan menganggap timeout sebagai transaksi gagal secara
otomatis. - Sediakan mekanisme pengecekan status transaksi. - Catat
setiap perubahan status dan aktivitas penting. - Jangan mengubah atau
menghapus histori ledger untuk menyamarkan kesalahan; gunakan entri
koreksi yang dapat diaudit.

------------------------------------------------------------------------

## 10. Hal yang Belum Ditentukan

Bagian ini sengaja dibiarkan terbuka agar tidak mengarang keputusan
teknis sebelum waktunya.

  Area                                      Status
  ----------------------------------------- ------------------
  Nama dan daftar final microservices       Belum ditentukan
  Teknologi database per service            Belum ditentukan
  Format kontrak API Bank Fiktif            Belum ditentukan
  Metode autentikasi API dan webhook        Belum ditentukan
  Model ledger dan aturan akuntansi final   Perlu dirancang
  Retensi log dan audit trail               Belum ditentukan
  Klasifikasi data final                    Perlu validasi
  Infrastruktur deployment                  Belum ditentukan
  Detail settlement merchant                Perlu dirancang

------------------------------------------------------------------------

## 11. Definition of Done --- R&D Asset Inventory & DFD

Tahap R&D ini dianggap selesai ketika:

-   [ ] Aktor dan pihak eksternal sudah diidentifikasi.
-   [ ] Batas sistem Paynusa dan Bank Fiktif sudah jelas.
-   [ ] Aset data, software, infrastructure, dan secret sudah
    diinventarisasi.
-   [ ] Pemilik fungsi dan sensitivitas awal setiap aset sudah dicatat.
-   [ ] DFD Level 0 sudah menggambarkan interaksi utama.
-   [ ] DFD Level 1 top-up sudah menggambarkan aliran data utama.
-   [ ] DFD Level 1 pembayaran merchant sudah menggambarkan aliran data
    utama.
-   [ ] Trust boundary dan risiko utama sudah diidentifikasi.
-   [ ] Asumsi dan keputusan teknis yang belum ditentukan sudah dicatat.

------------------------------------------------------------------------

## 12. Prinsip Baseline

Dokumen ini adalah blueprint R&D awal untuk proyek portofolio Paynusa.
Business model dan batasan proyek yang telah disepakati menjadi acuan.
Detail teknis dapat diperinci tanpa mengubah model bisnis yang telah
dikunci.

**Prinsip utama: pahami aset dan aliran data terlebih dahulu, lalu
turunkan kebutuhan keamanan dan desain teknis dari hasil analisis
tersebut.**
