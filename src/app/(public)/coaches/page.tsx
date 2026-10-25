import type { Metadata } from "next";

import { CoachCard, CtaBand, PageIntro, Section } from "@/components/public/public-blocks";
import { listPublicCoaches } from "@/services/public-service";

export const metadata: Metadata = {
  title: "Pelatih",
  description: "Kenali pelatih renang dan finswimming kami.",
};

export default async function CoachesPage() {
  const coaches = await listPublicCoaches();
  return (
    <>
      <PageIntro
        eyebrow="Pelatih"
        title="Tim pelatih"
        description="Pelatih kami menyusun program, memantau time trial, dan mendampingi atlet di setiap kejuaraan."
      />
      <Section title={`${coaches.length} pelatih aktif`}>
        {coaches.length === 0 ? (
          <p className="text-muted-foreground">Profil pelatih akan segera tampil.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {coaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
        )}
      </Section>
      <CtaBand />
    </>
  );
}
