import { CalendarClock, Users } from "lucide-react";
import type { Metadata } from "next";

import { CtaBand, PageIntro, Section } from "@/components/public/public-blocks";
import { SITE, whatsappUrl } from "@/constants/site";
import { listPublicGroups } from "@/services/public-service";

export const metadata: Metadata = {
  title: "Program Latihan",
  description: "Program renang dan finswimming untuk berbagai usia dan level.",
};

export default async function ProgramsPage() {
  const groups = await listPublicGroups();
  return (
    <>
      <PageIntro
        eyebrow="Program"
        title="Program latihan"
        description="Mulai dari belajar renang hingga persiapan kejuaraan. Setiap atlet ditempatkan di kelompok sesuai kemampuannya."
      />
      <Section title="Pilihan program">
        <div className="grid gap-4 md:grid-cols-3">
          {SITE.programs.map((program) => (
            <article
              key={program.slug}
              id={program.slug}
              className="flex scroll-mt-24 flex-col gap-4 rounded-2xl border bg-card p-6"
            >
              <h2 className="font-heading text-xl font-bold">{program.title}</h2>
              <p className="text-muted-foreground">{program.description}</p>
              <ul className="mt-auto flex flex-col gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <Users className="size-4 text-primary" aria-hidden="true" />
                  {program.audience}
                </li>
                <li className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" aria-hidden="true" />
                  {program.schedule}
                </li>
              </ul>
              <a
                href={whatsappUrl(`Halo, saya ingin bertanya tentang program ${program.title}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Tanya program ini
              </a>
            </article>
          ))}
        </div>
      </Section>
      {groups.length > 0 && (
        <div className="bg-card">
          <Section
            title="Kelompok latihan saat ini"
            description="Kelompok aktif di klub beserta pelatihnya."
          >
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="flex flex-col gap-1 rounded-2xl border bg-background p-5"
                >
                  <span className="font-heading font-bold">{group.name}</span>
                  {group.description && (
                    <span className="text-sm text-muted-foreground">{group.description}</span>
                  )}
                  <span className="text-sm">Pelatih: {group.coach?.fullName ?? "—"}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
      <CtaBand />
    </>
  );
}
