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

## 3. Color

Token ada di `src/app/globals.css` (`:root`, plus `.dark` untuk mode gelap nanti). Pakai nama token Tailwind (`bg-primary`, `text-muted-foreground`), jangan hex langsung.

| Token              | Hex       | Peran                                                 |
| ------------------ | --------- | ----------------------------------------------------- |
| `sidebar`          | `#0B1F33` | Deep navy: sidebar                                    |
| `primary`          | `#0B6FA4` | Ocean blue: tombol utama, link, item aktif bottom nav |
| `lane` / `ring`    | `#2EC4D6` | Aqua: penanda item aktif & fokus keyboard saja        |
| `background`       | `#F6F9FB` | Off-white dingin                                      |
| `card`             | `#FFFFFF` | Permukaan konten                                      |
| `foreground`       | `#0F1E2C` | Teks utama                                            |
| `muted-foreground` | `#526273` | Teks sekunder (kontras ≥ 4.5:1 di background)         |
| `border`           | `#DCE5EC` | Garis                                                 |

Warna status (hanya untuk status, bukan dekorasi): `success` `#1F8A5B`, `warning` `#A76A12`, `destructive` `#C9372C`, `info` `#0B6FA4`. Status juga wajib punya label/ikon, tidak hanya warna.

## 4. Typography

- Judul (`h1`–`h3`, `font-heading`): **Plus Jakarta Sans** 600/700, `tracking-tight`.
- Teks: **Geist**.
- Data (waktu lomba, statistik, kode): **Geist Mono** angka tabular lewat class `numeric`.

Hierarchy:

- H1 halaman: 24–28 px (`PageHeader`).
- H2: 20–24 px.
- H3: 16–20 px.
- Body: 14–16 px.
- Caption: 12–14 px.

### Ciri khas

Marka **"T"** di ujung lintasan dasar kolam renang: dipakai sebagai logo (`BrandMark`) dan sebagai penanda item navigasi aktif (`.lane-mark`, aqua). Ini satu-satunya elemen dekoratif; selebihnya tenang.

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

Sumber tunggal: `src/components/dashboard/nav-config.ts` (`ROLE_NAV`). Label memakai Bahasa Indonesia.

### Admin (`/admin`)

Ringkasan · Atlet · Pelatih · Kelompok Latihan · Latihan · Absensi · Time Trial · Event · Hasil Lomba · Pengguna

### Coach (`/coach`)

Ringkasan · Atlet Binaan · Latihan · Absensi · Time Trial · Event · Hasil Lomba · Evaluasi

### Athlete (`/athlete`)

Ringkasan · Jadwal · Event · Personal Best · Time Trial · Riwayat Lomba · Evaluasi · Profil

Bottom navigation mobile (atlet): Ringkasan, Jadwal, Event, Personal Best, Profil.

### Semua role

Menu pengguna (kanan atas): Keamanan akun, Keluar.

Menu yang halamannya belum dibuat ditangani route `[...section]` (tampilan "sedang dibangun"); halaman nyata otomatis menggantikannya.

## 7. Core Components

Sudah tersedia (pakai ulang, jangan buat duplikat):

| Komponen                                                                                                                                                                 | Lokasi                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| `DashboardShell` (sidebar, header, breadcrumb, menu user, bottom nav atlet)                                                                                              | `src/components/dashboard/dashboard-shell.tsx` |
| `PageHeader` (judul, deskripsi, aksi)                                                                                                                                    | `src/components/shared/page-header.tsx`        |
| `EmptyState`                                                                                                                                                             | `src/components/shared/empty-state.tsx`        |
| `ErrorState` (dipakai `error.tsx`)                                                                                                                                       | `src/components/shared/error-state.tsx`        |
| `PageSkeleton` (dipakai `loading.tsx`)                                                                                                                                   | `src/components/shared/page-skeleton.tsx`      |
| `BrandMark`                                                                                                                                                              | `src/components/dashboard/brand-mark.tsx`      |
| shadcn/ui: button, input, label, field, card, alert, checkbox, input-otp, breadcrumb, dropdown-menu, avatar, skeleton, empty, sidebar, sheet, tooltip, separator, sonner | `src/components/ui/`                           |

Komponen bersama tambahan (Phase 5): `ConfirmDialog` (konfirmasi aksi penting, opsional input alasan), `StatusBadge` (titik + teks, tone success/warning/danger/info/neutral), `StatCard`, `PaginationLinks` (paginasi berbasis query string) di `src/components/shared/`. Filter daftar memakai `<form method="get">` + `NativeSelect` agar filter tercermin di URL.

Komponen Phase 6–9: `AttendanceForm` (pill radio per atlet), `PersonalBestCard` / `PersonalBestGrid`, `ProgressChart` (grafik satu seri, sumbu y dibalik, tick bulat dari `niceTimeTicks`, tooltip mouse + panah keyboard, selalu disertai tabel).

Komponen event (Phase 10/10b): `DisciplinePicker` (`features/competitions`, checkbox per olahraga, opsi `renderMeta` untuk PB, `disabled`, nomor terkunci), `RegistrationEditor` (form pendaftaran mode atlet sendiri / pelatih-admin), `EventSummary` + `RegistrationWindowBadge`, `RosterView` (Per Atlet / Per Nomor Lomba), `ExportMenu` (unduh dengan loading), `NotificationList` di `features/competition-registrations`.

Komponen hasil lomba (Phase 11): `DisciplineResultForm` (lembar input per nomor; tabel di desktop, kartu di mobile), `ResultEventList`, `RaceHistory` (riwayat + rekap medali) di `features/race-results`. Medali memakai token `gold` / `silver` / `bronze` (`bg-gold/15 text-gold`).

Komponen evaluasi (Phase 12): `EvaluationCard` (isi lengkap, 4 bagian), `EvaluationRows` (daftar ringkas pelatih), `EvaluationForm` di `features/evaluations`.

Komponen dashboard (Phase 13): `SectionCard` / `SectionEmpty` (`components/shared`), `StatCard` dengan `suffix`/`hint` dan nilai teks, `AttendanceBar`, `NotificationBell` (header admin), `AthleteSummary` (data diri atlet), dashboard per role di `features/dashboard`.

Belum dibuat (menyusul sesuai fase): CoachCard, FormModal.

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
