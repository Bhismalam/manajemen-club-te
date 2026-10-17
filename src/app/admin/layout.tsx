import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <DashboardShell role="ADMIN">{children}</DashboardShell>;
}
