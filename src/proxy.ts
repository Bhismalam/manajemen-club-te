import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { LOGIN_PATH } from "@/lib/auth/routes";

// Pengecekan optimistis: hanya melihat keberadaan cookie session agar redirect ke login cepat.
// Validasi session, role, dan status akun tetap dilakukan di server (src/lib/auth/session.ts).
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const loginUrl = new URL(LOGIN_PATH, request.url);
  loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

// Area yang butuh login. Tambahkan prefix baru di sini.
export const config = {
  matcher: ["/admin/:path*", "/coach/:path*", "/athlete/:path*", "/settings/:path*", "/dashboard"],
};
