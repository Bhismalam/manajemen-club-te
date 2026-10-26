import type { MetadataRoute } from "next";

// Aplikasi privat untuk anggota klub: semua crawler ditolak.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
