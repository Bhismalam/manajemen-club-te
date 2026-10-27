import type { PoolConfig } from "pg";

// Konfigurasi koneksi node-postgres untuk Prisma (aplikasi & script CLI).
// Produksi (Supabase): isi DATABASE_CA_CERT dengan sertifikat CA Supabase (PEM) agar koneksi
// TLS terverifikasi penuh. Parameter ssl* di URL dibuang supaya tidak menimpa pengaturan ini.
// Tanpa DATABASE_CA_CERT (mis. Postgres lokal), URL dipakai apa adanya.
export function pgConfig(connectionString: string): PoolConfig {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca) return { connectionString };

  const url = new URL(connectionString);
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("ssl") || key === "uselibpqcompat") url.searchParams.delete(key);
  }
  return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true } };
}
