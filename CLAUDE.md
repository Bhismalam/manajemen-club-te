# CLAUDE.md — Project Instructions

## Project

Swim & Finswimming Club Management System.

Tujuan file ini adalah memberikan aturan kerja untuk AI coding agent agar implementasi konsisten, aman, dan sesuai arsitektur.

Dokumen spesifikasi ada di folder `doc/`. Aturan agent dari Next.js:

@AGENTS.md

## 1. Tech Stack

Gunakan:

- Next.js 16 (App Router, Turbopack, `cacheComponents` aktif)
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui (style `base-nova`, berbasis Base UI)
- PostgreSQL
- Prisma ORM 7 (driver adapter `@prisma/adapter-pg`)
- Better Auth (plugin `twoFactor` + `admin`)
- Zod
- React Hook Form
- exceljs (export Excel)
- @react-pdf/renderer (export PDF)
- pnpm sebagai package manager

Deployment:

- Vercel
- Supabase / managed PostgreSQL

### 1.1 Catatan versi

- Next.js 16: file `middleware.ts` sudah diganti `proxy.ts` (runtime Node.js). Baca `node_modules/next/dist/docs/` sebelum memakai API yang belum pasti.
- Prisma 7: client digenerate ke `src/generated/prisma` (tidak di-commit). Import dari `@/generated/prisma/client`, dan pakai instance tunggal di `src/lib/db/prisma.ts`, jangan membuat `new PrismaClient()` di tempat lain.
- Koneksi database dibaca dari `DATABASE_URL` di `.env.local` (oleh Next.js dan `prisma.config.ts`).
- Waktu: timestamp UTC di DB, tampil & input dalam jam klub (WITA) lewat helper di `src/lib/format.ts` (jangan `toLocaleString` tanpa zona waktu).
- Helper `cn()` ada di `src/lib/utils.ts` (dipakai shadcn). Jangan membuat folder `src/lib/utils/`.
- File (PDF event, foto) disimpan di Supabase Storage lewat `src/lib/storage/supabase.ts` (server-only, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, jangan pakai prefix `NEXT_PUBLIC_`). Upload besar memakai signed upload URL langsung dari browser, lalu dikonfirmasi & dicek di server. Jangan menyimpan file di database atau folder lokal.

### 1.2 Perintah

- `pnpm dev`: development server.
- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test`, atau sekaligus `pnpm check`.
- `pnpm build`: production build.
- `pnpm db:generate`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm db:reset`, `pnpm db:studio`.
- `pnpm mfa:reset --email <email> --reason "..." --yes`: reset MFA darurat dari server.
- `pnpm storage:setup`: buat/selaraskan bucket Supabase Storage (idempoten).

## 2. Coding Principles

Selalu:

- Gunakan TypeScript strict.
- Hindari `any`.
- Gunakan reusable components.
- Gunakan server-side authorization.
- Validasi input dengan Zod.
- Jangan percaya role dari client.
- Jangan menaruh secret di source code.
- Jangan expose database credential.
- Buat function kecil dan jelas.
- Gunakan meaningful naming.

## 3. Architecture Rules

Layer utama:

1. UI.
2. Application/service.
3. Data access.
4. Database.

UI tidak boleh mengakses database secara langsung tanpa service/data layer yang jelas.

Contoh:
`Page -> Server Action/API -> Service -> Repository/Prisma -> Database`

## 4. Folder Structure

```text
src/
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── admin/
│   ├── coach/
│   ├── athlete/
│   └── api/
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── dashboard/
│   └── shared/
│
├── features/
│   ├── auth/
│   ├── users/
│   ├── athletes/
│   ├── coaches/
│   ├── training/
│   ├── attendance/
│   ├── time-trials/
│   ├── competitions/
│   ├── competition-registrations/
│   ├── exports/
│   ├── notifications/
│   └── evaluations/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── permissions/
│   ├── validations/
│   └── utils.ts
│
├── generated/        # Prisma Client, hasil generate (jangan diedit/commit)
├── hooks/
├── services/
├── repositories/
├── types/
└── constants/
```

## 5. Role Rules

### ADMIN

Boleh:

- Manage users.
- Manage athlete/coach.
- Manage training.
- Manage competition.
- Melihat semua pendaftar event dan export Excel/PDF.
- Mengubah/membatalkan pendaftaran kapan saja.
- View system-wide data.

Wajib:

- MFA aktif sebelum mengakses fitur admin.

### COACH

Boleh:

- View assigned athletes.
- Manage training.
- Manage attendance.
- Manage time trials.
- Manage race result.
- Create evaluation.
- Mendaftarkan atlet binaan ke event (sebelum deadline).
- Membuat event dan mengelola event buatannya sendiri (PRD §4.9.1).

Tidak boleh:

- Mengubah role user.
- Mengakses admin settings.
- Mendaftarkan atlet yang bukan binaannya.
- Export rekap pendaftar.

### ATHLETE

Boleh:

- Melihat profil sendiri.
- Melihat jadwal.
- Melihat absensi sendiri.
- Melihat time trial sendiri.
- Melihat PB sendiri.
- Melihat hasil lomba sendiri.
- Melihat evaluasi sendiri.
- Melihat event dan mengunduh PDF event.
- Mendaftarkan diri sendiri ke event, mengubah, atau membatalkannya sebelum deadline.

Tidak boleh:

- Mengubah hasil performa.
- Melihat data privat atlet lain.
- Mendaftarkan atlet lain.

## 6. Authorization Rule

Setiap protected operation harus memeriksa:

1. User login.
2. Role.
3. Ownership.
4. Resource permission.

Jangan hanya menyembunyikan button di frontend.

Guard yang tersedia di `src/lib/auth/session.ts`:

- `requireUser()`: semua halaman/aksi yang butuh login.
- `requireRole("COACH" | "ATHLETE", ...)`: area pelatih/atlet.
- `requireAdmin()`: **wajib** untuk semua page, Server Action, dan Route Handler admin (termasuk cek MFA). Jangan pakai `requireRole("ADMIN")` untuk area admin.

Panggil guard di dalam komponen yang dibungkus `<Suspense>` (aturan `cacheComponents`), bukan di level atas layout.

Untuk izin berbasis data (ownership), pakai `src/lib/permissions/`:

- `requireActor()` untuk mendapatkan `Actor` (sudah termasuk cek MFA admin).
- `requireAthleteAccess(actor, athleteId, "view" | "manage")` untuk satu resource.
- `athleteScope(actor)` di **setiap** query daftar data atlet; `trainingSessionScope(actor)` untuk sesi latihan.
- Ambil satu resource dengan `findFirst({ where: { AND: [{ id }, scope] } })` → 404 jika di luar scope.
- Tambahkan kebijakan baru sebagai fungsi murni di `policies.ts` beserta tesnya.

## 7. Database Rules

- Gunakan UUID/CUID.
- Set timestamp.
- Gunakan foreign key.
- Gunakan enum untuk status yang stabil.
- Hindari hard delete untuk data penting.
- Gunakan `deletedAt` atau `isActive` jika perlu.
- Tambahkan index untuk foreign key dan field pencarian.

## 8. API Rules

Response standar:

```json
{
  "success": true,
  "data": {},
  "message": "..."
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

## 9. Validation

Semua input wajib divalidasi server-side.

Contoh:

- Email valid.
- Waktu lomba > 0.
- Tanggal valid.
- User ID harus ada.
- Athlete harus memiliki permission yang sesuai.

## 10. UI Rules

- Responsive.
- Mobile first.
- Konsisten.
- Form memiliki label.
- Loading state.
- Empty state.
- Error state.
- Confirmation untuk destructive action.
- Halaman dashboard baru: taruh di `src/app/{admin|coach|athlete}/...`, otomatis memakai `DashboardShell`. Mulai dengan `PageHeader`, bungkus bagian yang membaca session/data dengan `<Suspense fallback={<PageSkeleton />}>`.
- Pakai `EmptyState`, `ErrorState`, `PageSkeleton` dari `src/components/shared/` untuk state halaman.
- Menu baru ditambahkan di `src/components/dashboard/nav-config.ts`.
- Client component yang memakai `usePathname` / `useSearchParams` wajib berada di dalam `<Suspense>` (build gagal di route dinamis jika tidak).
- Warna lewat token (`bg-primary`, `text-muted-foreground`); aqua (`lane`/`ring`) hanya untuk item aktif & fokus.
- Setelah menambah folder route baru, restart `pnpm dev` jika route belum terdeteksi (404).

## 11. Git Workflow

Branch:

- `main`
- `develop`
- `feature/*`
- `fix/*`

Commit:

- `feat:`
- `fix:`
- `refactor:`
- `docs:`
- `test:`
- `chore:`

## 12. Development Workflow

Sebelum coding:

1. Baca `doc/PRD.md`.
2. Baca `doc/ARCHITECTURE.md`.
3. Baca `doc/DATABASE.md`.
4. Baca `doc/SECURITY.md`.
5. Baca `doc/DESIGN.md` untuk pekerjaan UI.
6. Cek `doc/TASK.md`.

Saat coding:

1. Kerjakan satu task.
2. Jangan mengubah scope tanpa alasan.
3. Jalankan lint (`pnpm lint`).
4. Jalankan typecheck (`pnpm typecheck`).
5. Jalankan test.
6. Update `doc/TASK.md`.

## 13. Forbidden

Jangan:

- Hardcode password.
- Hardcode secret.
- Disable authorization.
- Menggunakan `any` tanpa alasan.
- Menghapus migration history sembarangan.
- Mengubah schema tanpa migration.
- Membuat duplicate component jika reusable component sudah ada.
- Menyimpan password plain text.
- Menyimpan role hanya di client state.
- Membuat tabel/flow auth sendiri di luar Better Auth.
- Melewati cek MFA untuk route/action admin.
- Menerima `athleteId` dari form untuk role ATHLETE (ambil dari session).

## 14. Definition of Done

Task selesai jika:

- Fitur bekerja.
- Permission benar.
- Validation benar.
- UI responsif.
- Error handling tersedia.
- TypeScript tidak error.
- Lint lolos.
- Test utama lolos.
- Dokumentasi diperbarui jika dibutuhkan.
