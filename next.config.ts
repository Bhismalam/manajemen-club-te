import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// HSTS & upgrade-insecure-requests hanya untuk deployment HTTPS (bukan `next start` lokal via http).
const isHttps = process.env.BETTER_AUTH_URL?.startsWith("https://") ?? false;

// Browser mengunggah PDF event langsung ke Supabase Storage (signed upload URL).
function supabaseOrigin(): string | null {
  try {
    return process.env.SUPABASE_URL ? new URL(process.env.SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
}

// CSP tanpa nonce (doc/SECURITY.md §17): nonce memaksa semua halaman dirender dinamis dan
// mematikan halaman statis/PPR. 'unsafe-inline' tetap diperlukan untuk skrip inline Next.js;
// perlindungan XSS utama tetap dari escaping React (tanpa dangerouslySetInnerHTML).
function contentSecurityPolicy() {
  const storage = supabaseOrigin();
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob:${storage ? ` ${storage}` : ""}`,
    "font-src 'self'",
    `connect-src 'self'${storage ? ` ${storage}` : ""}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    ...(isHttps ? ["upgrade-insecure-requests"] : []),
  ];
  return directives.join("; ");
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isHttps
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  // Dipakai Route Handler export rekap pendaftar; dijalankan langsung dari node_modules.
  serverExternalPackages: ["exceljs"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
