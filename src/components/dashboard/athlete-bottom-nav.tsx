"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";

import { cn } from "@/lib/utils";

import { activeNavItem, ROLE_NAV } from "./nav-config";

// Navigasi bawah untuk atlet di layar kecil (doc/DESIGN.md §5). Item lain tetap ada di drawer.
export function AthleteBottomNav() {
  return (
    <Suspense fallback={<BottomNavItems activeHref={null} />}>
      <ActiveBottomNav />
    </Suspense>
  );
}

function ActiveBottomNav() {
  return <BottomNavItems activeHref={activeNavItem("ATHLETE", usePathname())?.href ?? null} />;
}

function BottomNavItems({ activeHref }: { activeHref: string | null }) {
  const items = ROLE_NAV.ATHLETE.items.filter((item) => item.mobile);

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 px-1 py-2 text-[11px] font-medium text-muted-foreground outline-none focus-visible:bg-muted",
                  isActive && "text-primary",
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
