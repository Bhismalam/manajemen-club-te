import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  CoachCard,
  CtaBand,
  LaneLines,
  MedalCounts,
  PublicEventCard,
  Section,
} from "@/components/public/public-blocks";
import { buttonVariants } from "@/components/ui/button";
import { SITE, whatsappUrl } from "@/constants/site";
import { formatDate } from "@/lib/format";
import {
  getClubStats,
  getPublicAchievements,
  listPublicCoaches,
  listPublicEvents,
} from "@/services/public-service";

export const metadata: Metadata = {
  title: { absolute: SITE.name },
  description: SITE.tagline,
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Intro />
      <Programs />
      <Reasons />
      <Coaches />
      <Achievements />
      <UpcomingEvents />
      <Gallery />
      <CtaBand />
    </>
  );
}

async function Hero() {
  const stats = await getClubStats();
  const items = [
    { label: "Atlet aktif", value: stats.athletes },
    { label: "Pelatih", value: stats.coaches },
    { label: "Kelompok latihan", value: stats.groups },
    { label: "Medali lomba", value: stats.medals },
  ];
  return (
    <section className="relative overflow-hidden bg-sidebar text-white">
      <LaneLines />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16">
        <div className="flex max-w-3xl flex-col gap-5">
          <p className="text-sm font-semibold tracking-wider text-white/70 uppercase">
            Renang &amp; Finswimming · {SITE.city}
          </p>
          <h1 className="font-heading text-4xl leading-tight font-bold md:text-6xl">
            Melaju lebih cepat, satu lintasan demi satu lintasan.
          </h1>
          <p className="max-w-2xl text-lg text-white/80">{SITE.tagline}</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/programs" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              Lihat program
              <ArrowRight />
            </Link>
            <a
              href={whatsappUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className:
                  "border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white",
              })}
            >
              Coba latihan
            </a>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-white/10 md:grid-cols-4">
          {items.map((item) => (
            <div key={item.label} className="flex flex-col gap-1 bg-sidebar/80 p-5">
              <dt className="text-sm text-white/70">{item.label}</dt>
              <dd className="numeric text-3xl font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Intro() {
  return (
    <Section
      eyebrow="Tentang klub"
      title={`Membina atlet sejak ${SITE.foundedYear}`}
      href="/about"
      linkLabel="Kenali kami"
    >
      <div className="grid gap-8 md:grid-cols-2">
        <p className="text-lg text-muted-foreground">{SITE.about[0]}</p>
        <blockquote className="border-l-4 border-primary pl-5 text-lg font-medium">
          {SITE.vision}
        </blockquote>
      </div>
    </Section>
  );
}

function Programs() {
  return (
    <div className="bg-card">
      <Section
        eyebrow="Program"
        title="Pilih program sesuai usia dan tujuan"
        href="/programs"
        linkLabel="Detail program"
      >
        <div className="grid gap-4 md:grid-cols-3">
          {SITE.programs.map((program) => (
            <article
              key={program.slug}
              className="flex flex-col gap-3 rounded-2xl border bg-background p-6"
            >
              <p className="text-sm font-medium text-primary">{program.audience}</p>
              <h3 className="font-heading text-xl font-bold">{program.title}</h3>
              <p className="text-sm text-muted-foreground">{program.description}</p>
              <p className="mt-auto text-sm">{program.schedule}</p>
            </article>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Reasons() {
  return (
    <Section eyebrow="Kenapa bergabung" title="Latihan serius, progres yang terlihat">
      <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {SITE.reasons.map((reason, index) => (
          <li key={reason.title} className="flex flex-col gap-2">
            <span className="numeric text-3xl font-semibold text-primary">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="font-heading text-lg font-bold">{reason.title}</h3>
            <p className="text-sm text-muted-foreground">{reason.description}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

async function Coaches() {
  const coaches = await listPublicCoaches();
  if (coaches.length === 0) return null;
  return (
    <div className="bg-card">
      <Section
        eyebrow="Pelatih"
        title="Dibimbing pelatih berpengalaman"
        href="/coaches"
        linkLabel="Semua pelatih"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {coaches.slice(0, 4).map((coach) => (
            <CoachCard key={coach.id} coach={coach} />
          ))}
        </div>
      </Section>
    </div>
  );
}

async function Achievements() {
  const { totals, events } = await getPublicAchievements();
  if (events.length === 0) return null;
  return (
    <Section
      eyebrow="Prestasi"
      title="Medali dari kejuaraan"
      href="/achievements"
      linkLabel="Semua prestasi"
    >
      <MedalCounts counts={totals} size="lg" />
      <ul className="grid gap-4 md:grid-cols-3">
        {events.slice(0, 3).map((row) => (
          <li key={row.event.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-6">
            <h3 className="font-heading text-lg font-bold">{row.event.name}</h3>
            <p className="text-sm text-muted-foreground">
              {formatDate(row.event.startDate)} · {row.event.location}
            </p>
            <MedalCounts counts={row} />
          </li>
        ))}
      </ul>
    </Section>
  );
}

async function UpcomingEvents() {
  const { upcoming } = await listPublicEvents();
  return (
    <div className="bg-card">
      <Section
        eyebrow="Event"
        title="Kejuaraan yang akan datang"
        href="/events"
        linkLabel="Semua event"
      >
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">
            Belum ada event terjadwal. Pantau terus halaman ini.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {upcoming.slice(0, 3).map((event) => (
              <PublicEventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function Gallery() {
  if (SITE.gallery.length === 0) return null;
  return (
    <Section
      eyebrow="Galeri"
      title="Momen latihan & lomba"
      href="/gallery"
      linkLabel="Lihat galeri"
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {SITE.gallery.slice(0, 4).map((photo) => (
          <div
            key={photo.src}
            className="relative aspect-square overflow-hidden rounded-xl bg-muted"
          >
            <Image
              src={photo.src}
              alt={photo.alt}
              fill
              sizes="(min-width: 768px) 25vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </Section>
  );
}
