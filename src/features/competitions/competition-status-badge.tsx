import type { StatusTone } from "@/components/shared/status-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { COMPETITION_STATUS_LABEL } from "@/constants/labels";
import type { CompetitionStatus } from "@/generated/prisma/enums";

const TONE: Record<CompetitionStatus, StatusTone> = {
  DRAFT: "neutral",
  UPCOMING: "info",
  ONGOING: "success",
  COMPLETED: "neutral",
  CANCELLED: "danger",
};

export function CompetitionStatusBadge({ status }: { status: CompetitionStatus }) {
  return <StatusBadge tone={TONE[status]}>{COMPETITION_STATUS_LABEL[status]}</StatusBadge>;
}
