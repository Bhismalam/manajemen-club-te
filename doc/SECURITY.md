# SECURITY.md — Security Requirements

## 1. Security Goals

Melindungi:

- Akun pengguna.
- Data atlet.
- Hasil performa.
- Evaluasi pelatih.
- Sistem admin.
- Database.
- File dan secret.

## 2. Authentication

Gunakan **Better Auth** (Prisma adapter + PostgreSQL). Auth.js kini dipelihara oleh tim Better Auth, dan Better Auth disarankan untuk proyek baru. Better Auth juga sudah menyediakan MFA, rate limit, dan plugin admin bawaan.

Requirement:

- Password minimal 8 karakter.
- Password hash menggunakan hashing bawaan Better Auth (jangan buat sendiri).
- Session expiration.
- Secure cookie.
- HttpOnly cookie.
- SameSite.
- HTTPS production.
- `BETTER_AUTH_SECRET` kuat dan hanya ada di environment variable.

### 2.1 Multi-Factor Authentication (MFA)

Metode:

- **TOTP** (RFC 6238) melalui aplikasi authenticator: Google Authenticator, Microsoft Authenticator, Authy, 1Password, dll.
- **Recovery codes**: 10 kode sekali pakai, ditampilkan sekali saat setup, disimpan terenkripsi.
- Tidak memakai SMS/WhatsApp OTP: ada biaya per pesan, rawan SIM-swap, dan pengirimannya tidak selalu andal.
- Passkey (WebAuthn): post-MVP.

Kebijakan per role:

| Role    | MFA                   | Trust device                        |
| ------- | --------------------- | ----------------------------------- |
| ADMIN   | **Wajib**             | Tidak diizinkan (selalu minta kode) |
| COACH   | Opsional (disarankan) | Maks 30 hari                        |
| ATHLETE | Opsional              | Maks 30 hari                        |

Enforcement admin:

- Admin dengan `twoFactorEnabled = false` hanya boleh mengakses `/settings/security/mfa-setup` dan logout.
- Dicek di guard server-side `requireAdmin()` pada setiap page, server action, dan route handler admin. `proxy.ts` (pengganti middleware di Next.js 16) hanya lapisan tambahan, bukan satu-satunya.
- Akun admin baru (termasuk seed admin) wajib setup MFA pada login pertama.
- "Percayai perangkat ini" untuk admin diabaikan di server (`hooks.before` di `src/lib/auth/auth.ts` memaksa `trustDevice = false`), bukan hanya disembunyikan di UI.
- Saat user dipromosikan menjadi ADMIN, panggil `revokeTrustedDevices()` (`src/services/mfa-service.ts`) agar perangkat tepercaya lamanya tidak bisa melewati MFA.

Setup MFA:

1. User memasukkan password ulang.
2. Sistem menampilkan QR code + secret manual.
3. User memasukkan kode 6 digit untuk verifikasi.
4. Sistem menampilkan recovery codes; user wajib mengonfirmasi sudah menyimpannya.

Menonaktifkan MFA:

- Wajib password akun (bawaan Better Auth).
- Admin tidak bisa menonaktifkan MFA miliknya sendiri (ditolak server dengan kode `ADMIN_MFA_REQUIRED`).

Kehilangan perangkat:

- User memakai recovery code, lalu setup ulang MFA.
- Jika recovery code juga hilang: admin lain dapat **reset MFA** user tersebut (`resetUserMfaAction` di `src/features/users/mfa-actions.ts`; tombolnya dipasang di halaman detail user, Phase 5). Admin tidak bisa mereset MFA miliknya sendiri. Reset menghapus secret & recovery code, mencabut semua session dan perangkat tepercaya, dan dicatat di audit log.
- Jika yang terkunci adalah admin terakhir: pemulihan lewat script CLI di server oleh pemilik sistem (bukan endpoint publik):

  ```bash
  pnpm mfa:reset --email admin@club.local --reason "HP hilang" --yes
  ```

  Tanpa `--yes` script hanya menampilkan target (dry run). Audit log mencatat actor = sistem.

Perlindungan:

- Per sesi login: maksimal 5 kode salah, setelah itu sesi verifikasi dibatalkan dan user harus login ulang (bawaan Better Auth).
- Per akun: kegagalan dihitung di `two_factor.failedVerificationCount`; akun dikunci sementara (`lockedUntil`) jika gagal terus.
- Rate limit per IP untuk semua endpoint `/two-factor/*`: 10 request / 5 menit (longgar karena alur setup memakai beberapa endpoint).
- Audit log: `mfa.enabled`, `mfa.disabled`, `mfa.backup_codes_regenerated`, `mfa.reset`. Percobaan gagal tidak dicatat per request; jejaknya ada di `failedVerificationCount`/`lockedUntil`.
- Belum diverifikasi: apakah kode TOTP yang sama bisa dipakai dua kali dalam window 30 detik (dicatat di TASK Phase 15).

### 2.2 Pembuatan akun

- Hanya admin yang membuat akun (pendaftaran publik dimatikan). Akun dibuat lewat API admin Better Auth dengan session admin, jadi Better Auth ikut memeriksa izin.
- Password awal: 12 karakter acak kriptografis tanpa karakter ambigu, **ditampilkan sekali** ke admin untuk diserahkan langsung. Tidak disimpan dalam bentuk asli dan tidak dikirim lewat chat/email oleh sistem.
- Pengguna **wajib** membuat password sendiri saat login pertama: `User.mustChangePassword` diset saat akun dibuat, dan `requireUser()` mengarahkan ke `/settings/change-password` sampai password diganti (flag dihapus di hook Better Auth setelah `/change-password` berhasil). Mengganti password mencabut sesi di perangkat lain.
- Lupa password (selama layanan email belum ada): admin membuat **password sementara** di detail user. Password lama tidak berlaku, semua sesi pengguna dicabut, pengguna wajib menggantinya saat login, dan aksi dicatat (`user.password_reset`). Admin tidak bisa memakai fitur ini untuk akunnya sendiri.
- Menonaktifkan/menangguhkan akun memakai `banUser` Better Auth (semua sesi langsung dicabut) dan wajib disertai alasan (tercatat di audit log).

## 3. Authorization

Gunakan RBAC + ownership check.

Setiap request server harus mengecek:

- authentication.
- role.
- resource ownership.
- permission.

Contoh risiko:
Athlete A mengganti URL menjadi ID Athlete B.

Sistem harus tetap menolak.

Contoh risiko pendaftaran event:

- Athlete A mengirim `athleteId` milik Athlete B di form pendaftaran → tolak (`FORBIDDEN`).
- Coach mendaftarkan atlet yang bukan binaannya → tolak.
- Mendaftar ke event `DRAFT` atau di luar periode pendaftaran → tolak (`CONFLICT`).
- Memilih `disciplineId` yang tidak dibuka di event tersebut → tolak (`VALIDATION_ERROR`).

`athleteId` untuk role ATHLETE selalu diambil dari session, bukan dari input form.

## 4. IDOR Protection

Jangan pernah menganggap ID random sudah aman.

Contoh:

```text
/athlete/results/:id
```

Backend harus memastikan data tersebut milik user yang berhak.

## 5. Input Validation

Gunakan Zod.

Validasi:

- string length.
- email.
- date.
- enum.
- numeric ranges.
- UUID/CUID.
- file type.
- file size.

## 6. SQL Injection

Gunakan Prisma parameterized query.

Jika menggunakan raw SQL:

- parameterized query wajib.
- jangan concatenate input user.

## 7. XSS

- Hindari `dangerouslySetInnerHTML`.
- Escape output.
- Sanitize rich text jika fitur itu tersedia.

## 8. CSRF

Jika menggunakan cookie session:

- gunakan mekanisme CSRF protection dari framework/auth provider.
- state-changing operation harus POST/PATCH/DELETE atau server action aman.

## 9. Rate Limiting

Terapkan pada:

- login.
- verifikasi MFA (TOTP / recovery code).
- forgot password.
- reset password.
- public contact form.
- submit pendaftaran event.
- export Excel/PDF.
- endpoint sensitif.

## 10. Password Reset

Token:

- random.
- single use.
- short expiration.
- disimpan secara aman.
- invalid setelah dipakai.

## 11. Session Security

Logout:

- invalidate session.

Account disabled:

- session aktif sebaiknya ikut invalid.

## 12. File Upload Security

Validasi:

- MIME type.
- extension.
- file size.

Rename file secara server-side.
Jangan menggunakan original filename sebagai storage path utama.

Allowed (gambar):

- jpg.
- jpeg.
- png.
- webp.

Allowed (dokumen event):

- pdf, maksimal 10 MB.
- Cek MIME `application/pdf` **dan** magic bytes `%PDF-` di awal file. Jangan hanya percaya ekstensi.
- Hanya ADMIN, atau COACH pembuat event, yang boleh upload (`canManageCompetition`).
- Upload langsung ke Supabase lewat **signed upload URL** yang dibuat server setelah cek izin; key objek dibuat server (`competitions/{id}/{uuid}.pdf`), nama asli hanya disimpan (disanitasi) sebagai nama unduhan.
- Setelah upload, server memverifikasi key milik event tersebut, ukuran, dan magic bytes; objek yang tidak valid langsung dihapus. Bucket juga membatasi MIME & ukuran.
- Disimpan di bucket privat; diunduh lewat `/api/competitions/[id]/attachment` yang mengecek permission lalu redirect ke signed URL 5 menit.
- Signed URL memakai opsi `download` sehingga Storage mengirim `Content-Disposition: attachment`; PDF tidak pernah disajikan dari domain aplikasi.
- `SUPABASE_SERVICE_ROLE_KEY` hanya di server (`import "server-only"`), tidak pernah memakai prefix `NEXT_PUBLIC_`.

## 12.1 Export Security (Excel/PDF)

- Endpoint export hanya untuk ADMIN dengan MFA terverifikasi (`requireAdmin()`).
- Data diambil ulang dari database di server; jangan menerima data roster dari client.
- Cegah **formula injection**: nilai sel yang diawali `=`, `+`, `-`, `@`, tab, atau carriage return diberi prefix `'`.
- Export hanya berisi field yang diperlukan panitia lomba: nama, nomor atlet, gender, tanggal lahir, kelompok, nomor lomba, seed time. Jangan menyertakan email, nomor HP, atau alamat kecuali memang diminta.
- `Cache-Control: no-store` pada response.
- Setiap export dicatat di audit log (siapa, event apa, format, waktu).

## 12.2 Website Publik

- Hanya data publik/agregat: jumlah atlet/pelatih/kelompok, nama & spesialisasi pelatih, kelompok latihan, event terbit (bukan DRAFT/CANCELLED), dan rekap medali per event.
- **Tidak** menampilkan nama atlet, nomor atlet, tanggal lahir, kontak pribadi, atau PDF event (PDF hanya untuk anggota yang login). Menampilkan nama atlet di halaman publik memerlukan persetujuan atlet/orang tua dan flag khusus (belum ada).
- Pendaftaran event tetap lewat akun anggota (`/login`).

## 13. Sensitive Data

Jangan expose:

- password hash (`Account.password`).
- TOTP secret dan recovery codes (setelah setup selesai).
- reset token.
- internal secret.
- full audit metadata.
- DB credentials.

## 14. Environment Variables

`.env` tidak boleh di-commit.

Gunakan:

```text
.env.example
.env.local
```

Secret production disimpan di deployment platform.

## 15. Audit Logging

Catat:

- user creation (`user.created`), edit (`user.updated`).
- role change (`user.role_changed`).
- user deactivate/activate (`user.status_changed`, dengan alasan).
- edit profil atlet/pelatih (`athlete.updated`, `coach.updated`) dan kelompok latihan (`training_group.*`), termasuk pergantian pelatih kelompok.
- race result update.
- PB manual correction.
- MFA enabled / disabled / reset.
- pendaftaran event dibuat / diubah / dibatalkan (termasuk siapa yang mendaftarkan).
- export rekap pendaftar.
- upload / ganti PDF event.
- destructive action.

## 16. Error Messages

Jangan leak stack trace ke user.

Production response:

```text
Something went wrong.
```

Detail teknis masuk logs.

## 17. Security Headers

Pertimbangkan:

- Content-Security-Policy.
- X-Frame-Options.
- X-Content-Type-Options.
- Referrer-Policy.
- Permissions-Policy.

## 18. Dependency Security

- Gunakan package terpercaya.
- Hindari dependency tidak perlu.
- Jalankan security audit.
- Update package secara berkala.

## 19. Database Security

- Production DB tidak public tanpa restriction.
- Least privilege.
- SSL connection.
- Backup terenkripsi jika provider mendukung.
- Jangan memakai production DB untuk development.

## 20. Admin Security

Admin adalah high-risk role.

Tambahan:

- Strong password.
- MFA wajib (lihat §2.1).
- Sensitive action confirmation.
- Audit log.

## 21. Privacy

Data atlet hanya digunakan untuk operasional klub.

Jika atlet anak/minor:

- pertimbangkan consent orang tua/wali.
- minimalkan data yang dikumpulkan.
- jangan tampilkan informasi sensitif ke website publik tanpa izin.

## 22. OWASP Priority

Fokus:

- Broken Access Control.
- Authentication failures.
- Injection.
- Security misconfiguration.
- Vulnerable components.
- Logging failures.

## 23. Security Testing Checklist

Sebelum release:

- Test login brute force.
- Test athlete accessing another athlete.
- Test coach unauthorized route.
- Test admin-only endpoint.
- Test invalid input.
- Test file upload.
- Test session after logout.
- Test disabled user.
- Test SQL injection payload.
- Test XSS payload.
- Test admin tanpa MFA mengakses `/admin/*`, admin action, dan export API.
- Test brute force kode TOTP.
- Test recovery code tidak bisa dipakai dua kali.
- Test athlete mendaftarkan athlete lain.
- Test coach mendaftarkan atlet yang bukan binaannya.
- Test pendaftaran setelah deadline / ke event DRAFT.
- Test discipline yang tidak dibuka di event.
- Test non-admin memanggil export API.
- Test formula injection (nama atlet `=HYPERLINK(...)`) di file Excel.
- Test upload file non-PDF yang diberi ekstensi `.pdf`.

## 24. Incident Response

Jika terjadi incident:

1. Disable compromised account.
2. Rotate secrets.
3. Review audit logs.
4. Patch vulnerability.
5. Restore if needed.
6. Document root cause.
