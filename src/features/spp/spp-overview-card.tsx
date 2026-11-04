import { SectionCard, SectionEmpty } from "@/components/shared/section-card";
import { formatMonth } from "@/lib/spp";
import type { getSppOverview, SppHistory } from "@/services/spp-service";

import { SppStatusBadge } from "./spp-status";

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col">
      <span className="numeric text-2xl font-semibold">{value}</span>
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

// Ringkasan dashboard admin & pelatih.
export function SppOverviewCard({
  overview,
  href,
}: {
  overview: Awaited<ReturnType<typeof getSppOverview>>;
  href: string;
}) {
  return (
    <SectionCard title={`SPP ${formatMonth(overview.month)}`} href={href} linkLabel="Kelola">
      {overview.configured ? (
        <div className="grid grid-cols-3 gap-4">
          <Figure label="Perlu dikonfirmasi" value={overview.waiting} />
          <Figure label="Belum bayar" value={overview.unpaid} />
          <Figure label="Lunas" value={overview.paid} />
        </div>
      ) : (
        <SectionEmpty>Tarif SPP belum diatur.</SectionEmpty>
      )}
    </SectionCard>
  );
}

// Ringkasan dashboard atlet.
export function AthleteSppCard({ history }: { history: SppHistory }) {
  if (!history.configured) return null;
  return (
    <SectionCard
      title={`SPP ${formatMonth(history.currentMonth)}`}
      href="/athlete/spp"
      linkLabel="Buka"
    >
      <div className="flex flex-wrap items-center gap-3">
        <SppStatusBadge status={history.current?.payment?.status} />
        {history.arrears.length > 0 && (
          <span className="text-sm text-destructive">Menunggak {history.arrears.length} bulan</span>
        )}
      </div>
    </SectionCard>
  );
}
