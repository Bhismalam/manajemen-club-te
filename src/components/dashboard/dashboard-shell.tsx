import { Suspense } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import type { UserRole } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

import { AppSidebar } from "./app-sidebar";
import { AthleteBottomNav } from "./athlete-bottom-nav";
import { DashboardBreadcrumb } from "./dashboard-breadcrumb";
import { UserMenu, UserMenuSkeleton } from "./user-menu";

// App shell dashboard: sidebar (drawer di mobile), header, area konten.
// Tidak membaca session di level ini agar shell bisa dirender statis; identitas user
// ada di <UserMenu> (Suspense) dan otorisasi dilakukan di setiap page.
export function DashboardShell({ role, children }: { role: UserRole; children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" aria-label="Buka menu navigasi" />
          <Separator
            orientation="vertical"
            className="mr-1 data-vertical:h-5 data-vertical:self-center"
          />
          <DashboardBreadcrumb role={role} />
          <div className="ml-auto">
            <Suspense fallback={<UserMenuSkeleton />}>
              <UserMenu />
            </Suspense>
          </div>
        </header>
        <div
          className={cn(
            "mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8",
            role === "ATHLETE" && "pb-24 md:pb-8",
          )}
        >
          {children}
        </div>
      </SidebarInset>
      {role === "ATHLETE" && <AthleteBottomNav />}
    </SidebarProvider>
  );
}
