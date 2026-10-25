import type { Metadata } from "next";

import { PageIntro, PublicEventCard, Section } from "@/components/public/public-blocks";
import { listPublicEvents } from "@/services/public-service";

export const metadata: Metadata = {
  title: "Event",
  description: "Kejuaraan renang dan finswimming yang diikuti klub.",
};

export default async function EventsPage() {
  const { upcoming, past } = await listPublicEvents();
  return (
    <>
      <PageIntro
        eyebrow="Event"
        title="Kejuaraan & event"
        description="Anggota klub mendaftar event lewat akun masing-masing setelah masuk."
      />
      <Section title="Akan datang">
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">Belum ada event terjadwal.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <PublicEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Section>
      {past.length > 0 && (
        <div className="bg-card">
          <Section title="Sudah berlangsung">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {past.map((event) => (
                <PublicEventCard key={event.id} event={event} />
              ))}
            </div>
          </Section>
        </div>
      )}
    </>
  );
}
