# DESIGN.md — UI/UX Design System

## 1. Design Direction

Karakter visual:

- Sporty.
- Modern.
- Clean.
- Professional.
- Energetic.
- Data-oriented.

Website publik lebih emosional dan visual.
Dashboard lebih fokus pada efisiensi dan readability.

## 2. Design Principles

1. Informasi penting terlihat cepat.
2. Tidak terlalu banyak warna.
3. Dashboard tidak penuh dekorasi.
4. Data performa menjadi fokus utama.
5. Mobile tetap usable.
6. Status harus mudah dibedakan.
7. Semua action penting memiliki feedback.

## 3. Suggested Color Direction

Gunakan nuansa:

- Deep navy.
- Ocean blue.
- Aqua/cyan sebagai accent.
- White / off-white.
- Neutral gray.

Gunakan warna status:

- Success.
- Warning.
- Error.
- Info.

Hindari penggunaan warna status sebagai warna dekoratif.

## 4. Typography

Gunakan sans-serif modern.

Contoh:

- Inter.
- Geist.
- Plus Jakarta Sans.

Hierarchy:

- H1: 32–40 px.
- H2: 24–32 px.
- H3: 20–24 px.
- Body: 14–16 px.
- Caption: 12–14 px.

## 5. Layout

### Dashboard Desktop

```text
+-----------------------------+
| Sidebar | Header            |
|         |-------------------|
|         | Main Content      |
|         |                   |
+-----------------------------+
```

### Mobile

- Sidebar menjadi drawer.
- Bottom navigation dapat dipertimbangkan untuk Athlete.

## 6. Navigation

### Admin

- Overview.
- Athletes.
- Coaches.
- Training.
- Attendance.
- Competitions.
- Results.
- Users.
- Settings.

### Coach

- Overview.
- My Athletes.
- Training.
- Attendance.
- Time Trials.
- Competitions.
- Evaluations.

### Athlete

- Overview.
- Schedule.
- Events (daftar event).
- Personal Best.
- Time Trials.
- Competition History.
- Evaluation.
- Profile.

### Semua role

- Settings → Security (password, MFA, recovery codes) di menu avatar/header.

## 7. Core Components

- AppSidebar.
- TopNavigation.
- StatCard.
- AthleteCard.
- CoachCard.
- DataTable.
- FilterBar.
- EmptyState.
- StatusBadge.
- PerformanceChart.
- PersonalBestCard.
- RaceResultCard.
- EvaluationCard.
- ConfirmDialog.
- FormModal.
- Toast.
- EventCard (nama, tanggal, lokasi, deadline pendaftaran, status "Terdaftar").
- DisciplinePicker (checkbox nomor lomba + PB/seed time di samping tiap nomor).
- AttachmentButton (unduh PDF event).
- RegistrationTable (rekap pendaftar dengan toggle Per Atlet / Per Nomor Lomba).
- ExportMenu (Download Excel / Download PDF).
- NotificationBell (badge pendaftaran baru untuk admin).
- MfaSetup (QR code, input kode 6 digit, tampilan recovery codes).
- OtpInput (input kode 6 digit di halaman login two-factor).

## 8. Dashboard Admin

Card:

- Total athletes.
- Active coaches.
- Training this week.
- Upcoming competition.

Section:

- Upcoming training.
- Upcoming competitions (dengan jumlah pendaftar dan deadline).
- Pendaftaran event terbaru.
- Recent activity.
- Attendance overview.

## 9. Dashboard Coach

Card:

- Athletes.
- Training today.
- PB this month.
- Upcoming competition.

Section:

- Today schedule.
- Recent time trials.
- Athlete performance.
- Evaluation pending.

## 10. Dashboard Athlete

Hero:

- Welcome message.
- Next training.

Card:

- Current PB highlights.
- Latest time trial.
- Attendance.
- Next competition.

Section:

- Event yang membuka pendaftaran (EventCard + tombol "Daftar").
- Performance graph.
- Competition history.
- Latest coach evaluation.

## 11. Athlete Profile

Header:

- Photo.
- Name.
- Athlete number.
- Training group.
- Status.

Tabs:

- Overview.
- Personal Best.
- Time Trial.
- Competitions.
- Attendance.
- Evaluations.

## 11a. Event & Pendaftaran

### Daftar Event (Athlete)

- List EventCard, urut berdasarkan deadline terdekat.
- Badge status: "Pendaftaran dibuka", "Ditutup", "Terdaftar".
- Tampilkan sisa waktu sebelum deadline (mis. "Tutup 3 hari lagi").

### Detail Event (Athlete / Coach)

```text
+--------------------------------------+
| Nama Event                           |
| Tanggal · Lokasi · Level             |
| Deadline pendaftaran                 |
| [Unduh PDF]                          |
|--------------------------------------|
| Deskripsi                            |
|--------------------------------------|
| Pilih nomor lomba                    |
| [x] 50m Surface      PB 00:21.45     |
| [ ] 100m Surface     PB 00:47.10     |
| [x] 50m Apnea        —               |
|--------------------------------------|
| [Daftar]  / [Simpan Perubahan]       |
| [Batalkan Pendaftaran]               |
+--------------------------------------+
```

- Coach: ada selector atlet binaan di atas DisciplinePicker.
- Setelah deadline: form read-only + info "Hubungi admin untuk perubahan".
- Batalkan pendaftaran memakai ConfirmDialog.

### Rekap Pendaftar (Admin)

```text
+------------------------------------------------------------+
| Nama Event · Tanggal · Deadline                            |
| [Total atlet: 24] [Total entry: 51] [Nomor: 8]             |
|------------------------------------------------------------|
| (Per Atlet | Per Nomor Lomba)  Filter  Cari  [Export v]    |
|------------------------------------------------------------|
| Tabel                                                      |
+------------------------------------------------------------+
```

- Per Atlet: satu baris per atlet, kolom nomor lomba berupa chip.
- Per Nomor Lomba: grup per nomor dengan header + jumlah peserta, baris atlet + seed time.
- ExportMenu: "Download Excel (.xlsx)" dan "Download PDF". Tampilkan loading saat file dibuat.
- Pendaftaran `CANCELLED` disembunyikan secara default (toggle untuk menampilkan, dengan StatusBadge).

## 11b. Auth & MFA Screens

- Login: email, password, link "Lupa password".
- Two-factor: OtpInput 6 digit (auto-advance, paste-able), link "Gunakan recovery code", checkbox "Percayai perangkat ini 30 hari" (disembunyikan untuk admin).
- MFA setup: langkah 1 scan QR (+ secret teks untuk input manual), langkah 2 verifikasi kode, langkah 3 recovery codes (tombol Copy / Download .txt + checkbox "Saya sudah menyimpan kode ini").
- Admin yang belum setup: halaman penuh dengan penjelasan singkat mengapa MFA wajib, tanpa sidebar admin.

## 12. Forms

Rule:

- Label wajib.
- Required field jelas.
- Inline validation.
- Error spesifik.
- Tombol save disabled saat submitting.
- Confirmation jika action destructive.

## 13. Tables

Gunakan untuk:

- Athletes.
- Coaches.
- Attendance.
- Competitions.
- Results.
- Event registrations.

Support:

- Search.
- Filter.
- Sort.
- Pagination.
- Empty state.

## 14. Charts

Gunakan chart hanya jika membantu keputusan.

Contoh:

- Athlete time progress.
- Attendance rate.
- PB improvement.

Jangan membuat chart hanya sebagai dekorasi.

## 15. Accessibility

- Minimum contrast WCAG AA.
- Form input memiliki label.
- Keyboard navigation.
- Focus state jelas.
- Button memiliki accessible name.
- Jangan hanya mengandalkan warna untuk status.

## 16. Responsive Breakpoints

Mobile-first:

- sm.
- md.
- lg.
- xl.

Prioritas mobile:

- Athlete dashboard.
- Schedule.
- Daftar & detail event (pendaftaran).
- PB.
- Time trial result.
- Login two-factor.

## 17. Public Website

### Homepage

Urutan:

1. Hero.
2. Club intro.
3. Programs.
4. Why join.
5. Coaches.
6. Achievements.
7. Upcoming events.
8. Gallery.
9. CTA.
10. Footer.

## 18. UX States

Setiap halaman wajib mempertimbangkan:

- Loading.
- Empty.
- Error.
- Success.
- Permission denied.

## 19. Microcopy

Gunakan bahasa sederhana.

Contoh:

- `Record Time Trial`
- `Add Competition Result`
- `New Personal Best`
- `No evaluation yet`
- `Register for Event`
- `You're registered`
- `Registration closes in 3 days`
- `Registration closed`
- `Download Excel` / `Download PDF`
- `Enter the 6-digit code from your authenticator app`
- `Use a recovery code`
- `Save these recovery codes somewhere safe. Each code can be used once.`

## 20. Design Workflow

1. Sitemap.
2. User flow.
3. Wireframe.
4. Design system.
5. High-fidelity UI.
6. Prototype.
7. Developer handoff.
