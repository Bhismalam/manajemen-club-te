"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState } from "react";

import { BrandMark } from "@/components/dashboard/brand-mark";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { PUBLIC_NAV, SITE } from "@/constants/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({
  pathname,
  onNavigate,
  vertical = false,
}: {
  pathname: string | null;
  onNavigate?: () => void;
  vertical?: boolean;
}) {
  return PUBLIC_NAV.filter((item) => item.href !== "/gallery" || SITE.gallery.length > 0).map(
    (item) => {
      const active = isActive(pathname, item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "rounded-md text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
            vertical ? "px-3 py-2.5 text-base" : "px-3 py-2",
            active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            active && !vertical && "underline decoration-lane decoration-2 underline-offset-8",
            active && vertical && "bg-muted",
          )}
        >
          {item.label}
        </Link>
      );
    },
  );
}

function ActiveNav(props: { onNavigate?: () => void; vertical?: boolean }) {
  return <NavLinks pathname={usePathname()} {...props} />;
}

// Navbar publik: tautan penuh di desktop, menu samping (sheet) di mobile.
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark className="size-6 text-primary" />
          <span className="font-heading text-base font-bold">
            <span className="hidden sm:inline">{SITE.name}</span>
            <span className="sm:hidden" aria-hidden="true">
              {SITE.shortName}
            </span>
            <span className="sr-only sm:hidden">{SITE.name}</span>
          </span>
        </Link>

        <nav aria-label="Navigasi utama" className="ml-auto hidden items-center gap-1 lg:flex">
          <Suspense fallback={<NavLinks pathname={null} />}>
            <ActiveNav />
          </Suspense>
        </nav>

        <Link href="/login" className={cn(buttonVariants({ size: "sm" }), "ml-auto lg:ml-2")}>
          Masuk
        </Link>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Buka menu">
                <Menu />
              </Button>
            }
          />
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>{SITE.name}</SheetTitle>
            </SheetHeader>
            <nav aria-label="Navigasi utama" className="flex flex-col gap-1 px-4">
              <Suspense fallback={<NavLinks pathname={null} vertical />}>
                <ActiveNav vertical onNavigate={() => setOpen(false)} />
              </Suspense>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
