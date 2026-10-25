import type { Metadata } from "next";

import { CtaBand, PageIntro, Section } from "@/components/public/public-blocks";
import { SITE } from "@/constants/site";
import { getClubStats } from "@/services/public-service";

export const metadata: Metadata = {
  title: "Tentang Klub",
  description: `Profil, visi, dan misi ${SITE.name}.`,
};

export default async function AboutPage() {
  const stats = await getClubStats();
  return (
    <>
      <PageIntro
        eyebrow="Tentang klub"
        title={`Membina perenang sejak ${SITE.foundedYear}`}
        description={SITE.tagline}
      />
      <Section title="Cerita kami">
        <div className="grid gap-10 md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-4 text-lg text-muted-foreground">
            {SITE.about.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-4 self-start">
            {[
              { label: "Atlet aktif", value: stats.athletes },
              { label: "Pelatih", value: stats.coaches },
              { label: "Kelompok latihan", value: stats.groups },
              { label: "Medali lomba", value: stats.medals },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1 rounded-2xl border bg-card p-5">
                <dt className="text-sm text-muted-foreground">{item.label}</dt>
                <dd className="numeric text-3xl font-semibold">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>
      <div className="bg-card">
        <Section title="Visi & misi">
          <div className="grid gap-8 md:grid-cols-2">
            <blockquote className="border-l-4 border-primary pl-5 font-heading text-xl font-bold md:text-2xl">
              {SITE.vision}
            </blockquote>
            <ul className="flex flex-col gap-4">
              {SITE.missions.map((mission, index) => (
                <li key={mission} className="flex gap-4">
                  <span className="numeric text-xl font-semibold text-primary">{index + 1}</span>
                  <span className="text-muted-foreground">{mission}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      </div>
      <Section title="Tempat latihan">
        <p className="text-lg">
          <span className="font-semibold">{SITE.contact.venue}</span>
          <br />
          <span className="text-muted-foreground">{SITE.contact.address}</span>
        </p>
      </Section>
      <CtaBand />
    </>
  );
}
