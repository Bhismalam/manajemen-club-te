# Swim & Finswimming Club Management System

Platform web untuk mengelola klub renang dan finswimming: website publik, dashboard Admin/Pelatih/Atlet, performa atlet, serta pendaftaran event.

Spesifikasi lengkap ada di [`doc/`](doc/), dan aturan kerja untuk AI agent ada di [`CLAUDE.md`](CLAUDE.md).

## Kebutuhan

- Node.js 22+ (dikembangkan dengan Node 24)
- pnpm
- PostgreSQL 16

## Setup lokal

```bash
pnpm install                      # juga menjalankan `prisma generate`
createdb web_atlit_dev
cp .env.example .env.local        # lalu isi DATABASE_URL
pnpm dev
```

Buka http://localhost:3000.

## Perintah

| Perintah           | Fungsi                            |
| ------------------ | --------------------------------- |
| `pnpm dev`         | Development server                |
| `pnpm build`       | Production build                  |
| `pnpm check`       | Lint + typecheck + cek format     |
| `pnpm format`      | Format semua file dengan Prettier |
| `pnpm db:migrate`  | Buat & jalankan migration (dev)   |
| `pnpm db:generate` | Generate ulang Prisma Client      |
| `pnpm db:studio`   | Buka Prisma Studio                |
