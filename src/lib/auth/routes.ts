import type { UserRole } from "@/generated/prisma/enums";

export const LOGIN_PATH = "/login";
export const DASHBOARD_PATH = "/dashboard";
export const TWO_FACTOR_PATH = "/login/two-factor";
export const SECURITY_SETTINGS_PATH = "/settings/security";
export const MFA_SETUP_PATH = "/settings/security/mfa-setup";

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
