import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { dashboardPathFor, LOGIN_PATH } from "@/lib/auth/routes";

// Titik masuk setelah login: arahkan ke dashboard sesuai role.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const target = user ? dashboardPathFor(user.role) : LOGIN_PATH;
  return NextResponse.redirect(new URL(target, request.url));
}
