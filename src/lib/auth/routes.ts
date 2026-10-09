import type { UserRole } from "@/generated/prisma/enums";

export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";

const ROLE_HOME: Record<UserRole, string> = {
  ADMIN: "/admin",
  COACH: "/coach",
  ATHLETE: "/athlete",
};

export function dashboardPathFor(role: UserRole): string {
  return ROLE_HOME[role];
}

// Cegah open redirect: hanya path internal ("/..."), bukan "//host" atau "/\host".
export function safeCallbackUrl(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return null;
  }
  return value;
}
