import { Construction } from "lucide-react";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ROLE_NAV } from "@/components/dashboard/nav-config";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { requireRole } from "@/lib/auth/session";

// Placeholder untuk menu yang halamannya belum dibuat. Halaman nyata (mis. athlete/athletes/page.tsx)
// otomatis menggantikan route ini. Path di luar menu → 404.
export default function AthleteSectionPage({ params }: PageProps<"/athlete/[...section]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Section params={params} />
    </Suspense>
  );
}

async function Section({ params }: { params: Promise<{ section: string[] }> }) {
  await requireRole("ATHLETE");
  const { section } = await params;
  const item = ROLE_NAV.ATHLETE.items.find((nav) => nav.href === `/athlete/${section.join("/")}`);
  if (!item) notFound();

  return (
    <>
      <PageHeader title={item.label} />
      <EmptyState
        icon={Construction}
        title="Halaman ini sedang dibangun"
        description={`Fitur ${item.label.toLowerCase()} akan tersedia di tahap pengembangan berikutnya.`}
      />
    </>
  );
}
