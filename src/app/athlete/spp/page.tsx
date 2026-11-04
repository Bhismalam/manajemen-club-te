import { Wallet } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageSkeleton } from "@/components/shared/page-skeleton";
import { SectionCard } from "@/components/shared/section-card";
import { AthleteSppHistory } from "@/features/spp/athlete-spp-history";
import { SppStatusBadge } from "@/features/spp/spp-status";
import { SubmitProofForm } from "@/features/spp/submit-proof-form";
import { formatRupiah } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { formatMonth } from "@/lib/spp";
import { getAthleteSppHistory } from "@/services/spp-service";

export const metadata: Metadata = { title: "SPP" };

export default function AthleteSppPage() {
  return (
    <>
      <PageHeader title="SPP" description="Status pembayaran SPP milikmu." />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const actor = await requireActor("ATHLETE");
  if (!actor.athleteId) {
    return (
      <EmptyState
        icon={Wallet}
        title="Profil atlet belum aktif"
        description="Hubungi admin klub agar profil atletmu diaktifkan."
      />
    );
  }

  // athleteId selalu dari session.
  const history = await getAthleteSppHistory(actor, actor.athleteId);
  if (!history.configured) {
    return (
      <EmptyState
        icon={Wallet}
        title="Tarif SPP belum diatur"
        description="Tagihan akan muncul setelah admin klub mengatur tarif."
      />
    );
  }

  const { current, arrears, currentMonth, payableMonths, today } = history;
  // Default: tunggakan paling lama, lalu bulan terdekat yang belum diajukan.
  const defaultMonth =
    arrears[0] ??
    payableMonths.find(({ month, pending }) => month >= currentMonth && !pending)?.month ??
    payableMonths[0]?.month;

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title={formatMonth(currentMonth)}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <SppStatusBadge status={current?.payment?.status} />
            {current?.expectedAmount != null && (
              <span className="numeric text-sm text-muted-foreground">
                Tagihan {formatRupiah(current.expectedAmount)}
              </span>
            )}
          </div>
          {arrears.length > 0 && (
            <p className="text-sm text-destructive">
              Menunggak {arrears.length} bulan: {arrears.map(formatMonth).join(", ")}
            </p>
          )}
        </div>
      </SectionCard>

      {defaultMonth && (
        <SectionCard
          title="Kirim bukti pembayaran"
          description="Setelah dikirim, admin atau pelatih akan mengonfirmasi pembayaranmu."
        >
          <SubmitProofForm
            key={defaultMonth}
            months={payableMonths}
            defaultMonth={defaultMonth}
            today={today}
          />
        </SectionCard>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Riwayat</h2>
        <AthleteSppHistory
          history={history}
          emptyDescription="Tagihan bulananmu akan tampil di sini."
        />
      </section>
    </div>
  );
}
