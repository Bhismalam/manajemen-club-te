import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function CoachLayout({ children }: LayoutProps<"/coach">) {
  return <DashboardShell role="COACH">{children}</DashboardShell>;
}
