"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import type { UserRole } from "@/generated/prisma/enums";

import { BrandMark } from "./brand-mark";
import { activeNavItem, ROLE_NAV } from "./nav-config";

export function AppSidebar({ role }: { role: UserRole }) {
  const nav = ROLE_NAV[role];

  return (
    <Sidebar>
      <SidebarHeader className="px-4 pt-5 pb-4">
        <Link
          href={nav.home}
          className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <BrandMark className="size-6 text-lane" />
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-sm font-bold text-sidebar-accent-foreground">
              Swim &amp; Finswimming
            </span>
            <span className="text-xs text-sidebar-foreground/70">Club · {nav.label}</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Path baru diketahui saat runtime: daftar menu tampil statis dulu,
                  penanda item aktif menyusul (aturan cacheComponents). */}
              <Suspense fallback={<NavItems role={role} activeHref={null} />}>
                <ActiveNavItems role={role} />
              </Suspense>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4 text-xs text-sidebar-foreground/60">
        Masuk sebagai {nav.label.toLowerCase()}
      </SidebarFooter>
    </Sidebar>
  );
}

function ActiveNavItems({ role }: { role: UserRole }) {
  const activeHref = activeNavItem(role, usePathname())?.href ?? null;
  return <NavItems role={role} activeHref={activeHref} />;
}

function NavItems({ role, activeHref }: { role: UserRole; activeHref: string | null }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return ROLE_NAV[role].items.map((item) => {
    const isActive = item.href === activeHref;
    return (
      <SidebarMenuItem key={item.href}>
        <SidebarMenuButton
          isActive={isActive}
          className="relative h-9 pl-4"
          render={
            <Link
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                if (isMobile) setOpenMobile(false);
              }}
            />
          }
        >
          {isActive && <span aria-hidden="true" className="lane-mark" />}
          <item.icon />
          <span>{item.label}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  });
}
