import type { StatusTone } from "@/components/shared/status-badge";
import type { UserStatus } from "@/generated/prisma/enums";

export function userStatusTone(status: UserStatus): StatusTone {
  if (status === "ACTIVE") return "success";
  if (status === "SUSPENDED") return "danger";
  return "neutral";
}
