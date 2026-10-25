import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/session";
import { CHANGE_PASSWORD_PATH, dashboardPathFor, LOGIN_PATH } from "@/lib/auth/routes";

// Titik masuk setelah login: arahkan ke dashboard sesuai role.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  const target = !user
    ? LOGIN_PATH
    : user.mustChangePassword
      ? CHANGE_PASSWORD_PATH
      : dashboardPathFor(user.role);
  return NextResponse.redirect(new URL(target, request.url));
}
