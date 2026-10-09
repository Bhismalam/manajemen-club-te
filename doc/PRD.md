# PRD — Swim & Finswimming Club Management System

## 1. Ringkasan Produk

Swim & Finswimming Club Management System adalah platform berbasis web untuk mengelola operasional klub renang dan finswimming/selam dalam satu sistem.

Platform memiliki:

- Website publik klub.
- Dashboard Admin.
- Dashboard Pelatih.
- Dashboard Atlet.
- Sistem autentikasi dan Role-Based Access Control.
- Monitoring performa atlet berbasis time trial, personal best, hasil lomba, dan evaluasi pelatih.

## 2. Tujuan Produk

Tujuan utama sistem:

1. Memusatkan data atlet, pelatih, latihan, lomba, dan hasil performa.
2. Mengurangi pencatatan manual melalui spreadsheet atau chat.
3. Membantu pelatih memonitor perkembangan atlet secara terstruktur.
4. Memberikan akses mandiri kepada atlet untuk melihat perkembangan performanya.
5. Membantu admin mengelola operasional klub.
6. Menjadi website resmi klub untuk branding dan informasi publik.

## 3. Target Pengguna

### Admin

Bertanggung jawab terhadap data klub, pengguna, jadwal, lomba, dan konfigurasi sistem.

### Pelatih

Bertanggung jawab terhadap latihan, absensi, time trial, hasil lomba, dan evaluasi atlet.

### Atlet

Dapat melihat profil, jadwal, hasil latihan, personal best, histori lomba, dan evaluasi pelatih, serta mendaftarkan diri ke event mendatang.

### Pengunjung Publik

Dapat melihat informasi umum klub tanpa login.

## 4. Scope MVP

### 4.1 Authentication

- Login.
- Logout.
- Reset password.
- Role-Based Access Control.
- Session management.
- Multi-Factor Authentication (MFA) berbasis TOTP + recovery codes.

Role:

- ADMIN
- COACH
- ATHLETE

Kebijakan MFA:

- ADMIN: wajib. Admin yang belum mengaktifkan MFA tidak bisa membuka halaman admin sebelum setup selesai.
- COACH dan ATHLETE: opsional, dapat diaktifkan sendiri di Settings → Security.
- Faktor kedua: kode 6 digit dari aplikasi authenticator (Google Authenticator, Authy, 1Password, dll.) + 10 recovery code sekali pakai.
- Tidak menggunakan SMS/WhatsApp OTP.

Detail teknis: lihat SECURITY.md §2.

### 4.2 Manajemen Pengguna

Admin dapat:

- Membuat akun pelatih.
- Membuat akun atlet.
- Mengaktifkan/nonaktifkan akun.
- Melihat daftar pengguna.

### 4.3 Profil Atlet

Data:

- Nama lengkap.
- Foto.
- Tanggal lahir.
- Jenis kelamin.
- Nomor atlet/KTA.
- Tanggal bergabung.
- Kategori/kelompok latihan.
- Status aktif.
- Nomor lomba yang diikuti.

### 4.4 Profil Pelatih

Data:

- Nama.
- Foto.
- Kontak.
- Spesialisasi.
- Status aktif.

### 4.5 Jadwal Latihan

Admin/pelatih dapat:

- Membuat jadwal latihan.
- Menentukan tanggal.
- Menentukan waktu.
- Menentukan lokasi.
- Menentukan kelompok latihan.
- Memberikan catatan latihan.

Atlet dapat:

- Melihat jadwal latihan.

### 4.6 Absensi

Pelatih dapat:

- Membuka sesi latihan.
- Menandai hadir, izin, sakit, atau tidak hadir.

Atlet dapat:

- Melihat histori absensi sendiri.

### 4.7 Time Trial

Pelatih dapat:

- Membuat sesi time trial.
- Memilih atlet.
- Memilih nomor lomba.
- Menginput waktu.
- Memberikan catatan.

Sistem:

- Membandingkan waktu dengan personal best.
- Menandai jika hasil baru menjadi PB.

### 4.8 Personal Best

Data PB:

- Atlet.
- Nomor lomba.
- Jarak.
- Gaya/disiplin.
- Waktu terbaik.
- Tanggal.
- Sumber hasil: latihan/time trial/lomba.

### 4.9 Event / Kompetisi & Pendaftaran

#### 4.9.1 Membuat Event

Admin/pelatih dapat:

- Membuat event.
- Menentukan nama event.
- Lokasi.
- Tanggal mulai dan selesai.
- Jenis/level kompetisi.
- Deskripsi event.
- Upload dokumen PDF (technical handbook / surat undangan).
- Memilih nomor lomba yang dibuka untuk event ini.
- Menentukan periode pendaftaran (buka dan tutup/deadline).
- Opsional: batas maksimal nomor lomba per atlet.
- Mempublikasikan event (status `DRAFT` → `UPCOMING`) agar terlihat oleh atlet.

#### 4.9.2 Pendaftaran Event

Atlet dapat:

- Melihat daftar event mendatang yang sedang membuka pendaftaran.
- Melihat detail event: nama, tanggal, lokasi, deskripsi, nomor lomba yang dibuka, dan mengunduh PDF.
- Mendaftarkan diri dengan memilih satu atau lebih nomor lomba.
- Mengubah nomor lomba atau membatalkan pendaftaran sebelum deadline.
- Melihat status pendaftarannya sendiri.

Pelatih dapat:

- Mendaftarkan atlet binaannya (atlet di training group miliknya) ke event.
- Mengubah/membatalkan pendaftaran atlet binaannya sebelum deadline.
- Melihat pendaftaran atlet binaannya.

Aturan:

- Pendaftaran **langsung diterima** (status `REGISTERED`), tanpa proses approve/tolak.
- Satu atlet hanya punya satu pendaftaran per event (berisi satu atau lebih nomor lomba).
- Nomor lomba yang dipilih harus termasuk nomor yang dibuka di event tersebut.
- Pendaftaran hanya bisa dilakukan saat event berstatus `UPCOMING` dan masih dalam periode pendaftaran.
- Hanya atlet berstatus aktif yang bisa didaftarkan.
- Seed time terisi otomatis dari personal best atlet untuk nomor tersebut (jika ada).
- Setelah deadline, hanya admin yang dapat mengubah atau membatalkan pendaftaran.

#### 4.9.3 Notifikasi ke Admin

- Setiap pendaftaran baru atau perubahan pendaftaran mengirim notifikasi in-app ke semua admin.
- Dashboard admin menampilkan badge jumlah pendaftaran baru.
- Notifikasi email masuk Phase 2.

#### 4.9.4 Rekap Pendaftar (Admin)

Admin melihat semua pendaftar sebuah event dalam **satu halaman**:

- Ringkasan: total atlet, total entry, jumlah atlet per nomor lomba.
- Tampilan **Per Atlet**: nama, nomor atlet/KTA, jenis kelamin, tanggal lahir, kelompok latihan, nomor lomba yang dipilih, seed time, didaftarkan oleh, waktu daftar.
- Tampilan **Per Nomor Lomba**: dikelompokkan per nomor lomba, berisi daftar atlet + seed time.
- Filter nomor lomba dan jenis kelamin, pencarian nama, opsi menampilkan pendaftaran yang dibatalkan.
- **Download Excel (.xlsx)**: berisi sheet "Per Atlet" dan sheet "Per Nomor Lomba".
- **Download PDF**: kop berisi nama event, tanggal, dan lokasi, diikuti daftar peserta per nomor lomba.

### 4.10 Hasil Lomba

Pelatih/admin dapat menginput:

- Atlet.
- Event.
- Nomor lomba.
- Waktu.
- Posisi.
- Medali.
- Catatan.

### 4.11 Evaluasi Pelatih

Pelatih dapat membuat evaluasi:

- Atlet.
- Tanggal.
- Kekuatan.
- Kekurangan.
- Fokus perbaikan.
- Target berikutnya.

Atlet hanya dapat melihat evaluasi miliknya.

### 4.12 Dashboard

#### Dashboard Admin

- Total atlet.
- Total pelatih.
- Jadwal latihan terdekat.
- Event terdekat.
- Pendaftaran event baru.
- Statistik kehadiran.
- Aktivitas terbaru.

#### Dashboard Pelatih

- Latihan hari ini.
- Atlet yang dibina.
- Time trial terbaru.
- Atlet dengan PB baru.
- Event terdekat.

#### Dashboard Atlet

- Jadwal latihan berikutnya.
- Personal best.
- Time trial terbaru.
- Histori lomba.
- Event yang sedang membuka pendaftaran.
- Evaluasi terbaru.
- Progress performa.

### 4.13 Website Publik

Halaman:

- Home.
- About Club.
- Program.
- Coaches.
- Athlete Highlights.
- Achievements.
- Events.
- Gallery.
- Contact.

## 5. Non-MVP / Phase 2

- Pembayaran membership.
- Reminder WhatsApp/email.
- Push notification.
- Ranking internal.
- Target performa.
- Grafik performa lanjutan.
- Upload dokumen atlet.
- Registrasi calon anggota.
- Notifikasi email pendaftaran event.
- Export PDF/Excel untuk laporan lain (selain rekap pendaftar event, yang sudah masuk MVP).
- Passkey (WebAuthn) sebagai metode login/MFA tambahan.
- Mobile application.
- Integrasi wearable/device.
- Parent account.
- Multi-club / SaaS.

## 6. User Flow Utama

### Login

User -> Login (email + password) -> Sistem verifikasi akun -> Jika MFA aktif: input kode authenticator / recovery code -> Sistem membaca role -> Redirect dashboard.

Admin tanpa MFA: Login -> Diarahkan ke halaman setup MFA (scan QR, verifikasi kode, simpan recovery codes) -> Redirect dashboard admin.

### Pendaftaran Event

Atlet -> Events -> Pilih event -> Baca deskripsi / unduh PDF -> Pilih nomor lomba -> Daftar -> Sistem validasi (periode, nomor lomba, status atlet) -> Simpan dengan status REGISTERED -> Notifikasi ke admin.

Pelatih -> Competitions -> Pilih event -> Pilih atlet binaan -> Pilih nomor lomba -> Daftar -> (alur sama seperti di atas).

### Rekap Pendaftar

Admin -> Competitions -> Pilih event -> Pendaftar -> Lihat per atlet / per nomor lomba -> Download Excel atau PDF.

### Time Trial

Pelatih -> Pilih sesi -> Pilih atlet -> Pilih nomor -> Input waktu -> Simpan -> Sistem cek PB -> Update PB jika lebih cepat.

### Hasil Lomba

Admin/Pelatih -> Pilih event -> Pilih atlet -> Pilih nomor -> Input waktu/posisi/medali -> Simpan -> Sistem cek PB -> Update histori atlet.

### Evaluasi

Pelatih -> Pilih atlet -> Buat evaluasi -> Simpan -> Atlet dapat melihat evaluasi.

## 7. Acceptance Criteria MVP

MVP dianggap selesai jika:

- Semua role dapat login.
- Admin wajib melewati MFA; coach/atlet dapat mengaktifkan MFA sendiri.
- Permission antar-role berjalan benar.
- Atlet dapat mendaftar event beserta nomor lombanya; pelatih dapat mendaftarkan atlet binaannya.
- Admin dapat melihat seluruh pendaftar event dalam satu halaman dan mengunduhnya sebagai Excel dan PDF.
- Admin dapat mengelola pengguna.
- Pelatih dapat mengelola latihan dan performa atlet.
- Atlet dapat melihat data pribadi miliknya.
- Personal best dapat diperbarui otomatis.
- Hasil lomba tercatat.
- Website publik tersedia.
- Tidak ada akses lintas atlet terhadap data privat.
- Sistem responsif di desktop dan mobile.

## 8. Success Metrics

- > 90% data latihan klub dicatat melalui sistem.
- Pengurangan pencatatan manual.
- Pelatih dapat melihat progres atlet dalam <30 detik.
- Atlet dapat menemukan PB dan histori lomba dalam <3 klik.
- Zero critical permission leak.

## 9. Prioritas Pengembangan

P0:

- Auth (termasuk MFA admin).
- RBAC.
- Users.
- Athlete.
- Coach.
- Training.
- Attendance.

P1:

- Time Trial.
- PB.
- Competition.
- Event Registration + export Excel/PDF.
- Race Result.
- Evaluation.

P2:

- Public website.
- Dashboard analytics.
- Notification.
- Reporting.
