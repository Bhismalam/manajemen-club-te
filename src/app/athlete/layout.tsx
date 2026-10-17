import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function AthleteLayout({ children }: LayoutProps<"/athlete">) {
  return <DashboardShell role="ATHLETE">{children}</DashboardShell>;
}
