"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, Suspense } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { UserRole } from "@/generated/prisma/enums";

import { activeNavItem, ROLE_NAV } from "./nav-config";

type Crumb = { label: string; href?: string };

function buildCrumbs(role: UserRole, pathname: string): Crumb[] {
  const nav = ROLE_NAV[role];
  const crumbs: Crumb[] = [{ label: "Ringkasan", href: nav.home }];
  const section = activeNavItem(role, pathname);

  if (section && section.href !== nav.home) {
    crumbs.push({ label: section.label, href: section.href });
    // Halaman di bawah section (detail, form) diberi label umum; halaman bisa
    // menampilkan nama spesifik di judulnya sendiri.
    if (pathname !== section.href) crumbs.push({ label: "Detail" });
  }

  const last = crumbs.at(-1);
  if (last) delete last.href;
  return crumbs;
}

export function DashboardBreadcrumb({ role }: { role: UserRole }) {
  return (
    <Suspense fallback={<Crumbs crumbs={[{ label: "Ringkasan" }]} />}>
      <PathCrumbs role={role} />
    </Suspense>
  );
}

function PathCrumbs({ role }: { role: UserRole }) {
  return <Crumbs crumbs={buildCrumbs(role, usePathname())} />;
}

function Crumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.label}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.href ? (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
