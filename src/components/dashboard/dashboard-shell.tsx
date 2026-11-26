import { Suspense } from "react";

import { ConnectionStatus } from "@/components/shared/connection-status";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { UserRole } from "@/generated/prisma/enums";
import { LogoutButton } from "@/features/auth/logout-button";
import { cn } from "@/lib/utils";

import { AppSidebar } from "./app-sidebar";
import { AthleteBottomNav } from "./athlete-bottom-nav";
import { DashboardBreadcrumb } from "./dashboard-breadcrumb";
import { NotificationBell } from "./notification-bell";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

// App shell dashboard: sidebar (drawer di mobile), header, area konten.
// Tidak membaca session di level ini agar shell bisa dirender statis; identitas user
// ada di <UserMenu> (Suspense) dan otorisasi dilakukan di setiap page.
export function DashboardShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-[calc(3.5rem+var(--safe-area-top))] shrink-0 items-center gap-2 border-b bg-background/90 pt-[var(--safe-area-top)] pr-[max(1rem,var(--safe-area-right))] pl-[max(1rem,var(--safe-area-left))] backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Buka menu navigasi" />
          <Separator
            orientation="vertical"
            className="mr-1 data-vertical:h-5 data-vertical:self-center"
          />
          <DashboardBreadcrumb role={role} />
          <div className="ml-auto flex items-center gap-2">
            {role === "ADMIN" && (
              <Suspense fallback={null}>
                <NotificationBell />
              </Suspense>
            )}
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
            <LogoutButton />
          </div>
        </header>
        <div
          className={cn(
            "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 pt-6 pr-[max(1rem,var(--safe-area-right))] pb-[calc(1.5rem+var(--safe-area-bottom))] pl-[max(1rem,var(--safe-area-left))] md:pt-8 md:pr-[max(2rem,var(--safe-area-right))] md:pb-[calc(2rem+var(--safe-area-bottom))] md:pl-[max(2rem,var(--safe-area-left))]",
            role === "ATHLETE" && "pb-[calc(6rem+var(--safe-area-bottom))]",
          )}
        >
          <ConnectionStatus />
          {children}
        </div>
      </SidebarInset>
      {role === "ATHLETE" && <AthleteBottomNav />}
    </SidebarProvider>
  );
}
