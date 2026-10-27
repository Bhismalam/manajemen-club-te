// Build di Vercel (`vercel-build` dipakai Vercel menggantikan `build`).
// Hanya deployment production yang menjalankan migrasi & data master ke database produksi;
// preview deployment hanya build, agar tidak pernah mengubah skema database produksi.

import { execSync } from "node:child_process";

const run = (command) => execSync(command, { stdio: "inherit" });

if (process.env.VERCEL_ENV === "production") {
  console.log("▶ Production: prisma migrate deploy");
  run("pnpm exec prisma migrate deploy");
  console.log("▶ Production: data master");
  run("pnpm exec tsx scripts/seed-master.ts");
} else {
  console.log(`▶ VERCEL_ENV=${process.env.VERCEL_ENV ?? "-"}: migrasi dilewati`);
}

run("pnpm exec next build");
