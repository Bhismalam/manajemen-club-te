import { ArrowRight, CalendarDays, MapPin, MessageCircle } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { COMPETITION_LEVEL_LABEL, MEDAL_LABEL } from "@/constants/labels";
import { SITE, whatsappUrl } from "@/constants/site";
import { MEDAL_CLASS } from "@/features/race-results/race-history";
import { formatDate, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PublicEvent } from "@/services/public-service";

// Garis lintasan kolam (dekorasi hero/intro). Putih transparan di atas latar navy.
export function LaneLines({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
      preserveAspectRatio="none"
      viewBox="0 0 400 240"
    >
      {[40, 90, 140, 190].map((y) => (
        <g key={y}>
          <line x1="0" x2="400" y1={y} y2={y} stroke="white" strokeOpacity="0.08" strokeWidth="1" />
          <line
            x1="0"
            x2="400"
            y1={y}
            y2={y}
            stroke="white"
            strokeOpacity="0.18"
            strokeWidth="3"
            strokeDasharray="2 10"
          />
        </g>
      ))}
      {/* Marka "T" di dinding ujung lintasan */}
      {[65, 115, 165].map((y) => (
        <g key={y} fill="white" fillOpacity="0.12">
          <rect x="330" y={y - 2} width="50" height="4" rx="2" />
          <rect x="376" y={y - 9} width="4" height="18" rx="2" />
        </g>
      ))}
    </svg>
  );
}

// Pembuka halaman publik selain beranda.
export function PageIntro({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <section className="relative overflow-hidden bg-sidebar text-white">
      <LaneLines />
      <div className="relative mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-14 md:px-8 md:py-20">
        <p className="text-sm font-semibold tracking-wider text-white/70 uppercase">{eyebrow}</p>
        <h1 className="max-w-3xl font-heading text-3xl font-bold md:text-5xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-base text-white/80 md:text-lg">{description}</p>
        )}
      </div>
    </section>
  );
}

export function Section({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-14 md:px-8 md:py-20",
        className,
      )}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex max-w-2xl flex-col gap-2">
          {eyebrow && (
            <p className="text-sm font-semibold tracking-wider text-primary uppercase">{eyebrow}</p>
          )}
          <h2 className="font-heading text-2xl font-bold md:text-4xl">{title}</h2>
          {description && <p className="text-muted-foreground md:text-lg">{description}</p>}
        </div>
        {href && (
          <Link href={href} className={cn(buttonVariants({ variant: "outline" }), "self-start")}>
            {linkLabel ?? "Selengkapnya"}
            <ArrowRight />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function CoachCard({
  coach,
}: {
  coach: { fullName: string; specialization: string | null; trainingGroups: { name: string }[] };
}) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <div
        aria-hidden="true"
        className="flex size-16 items-center justify-center rounded-full bg-primary font-heading text-xl font-bold text-primary-foreground"
      >
        {initials(coach.fullName)}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="font-heading text-lg font-bold">{coach.fullName}</h3>
        <p className="text-sm text-primary">
          {coach.specialization ? `Pelatih ${coach.specialization}` : "Pelatih"}
        </p>
      </div>
      {coach.trainingGroups.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Melatih: {coach.trainingGroups.map((group) => group.name).join(", ")}
        </p>
      )}
    </article>
  );
}

function dateRange(start: Date, end: Date) {
  return start.getTime() === end.getTime()
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

// Kartu event publik. Pendaftaran dilakukan anggota setelah login.
export function PublicEventCard({ event }: { event: PublicEvent }) {
  const open = event.registrationOpen;
  return (
    <article className="flex flex-col gap-4 rounded-2xl border bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge tone="info">{COMPETITION_LEVEL_LABEL[event.level]}</StatusBadge>
        {event.status === "ONGOING" && <StatusBadge tone="success">Sedang berlangsung</StatusBadge>}
        {open && <StatusBadge tone="success">Pendaftaran dibuka</StatusBadge>}
      </div>
      <h3 className="font-heading text-lg font-bold">{event.name}</h3>
      <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <CalendarDays className="size-4" aria-hidden="true" />
          {dateRange(event.startDate, event.endDate)}
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="size-4" aria-hidden="true" />
          {event.location}
        </li>
      </ul>
      {open && event.registrationClosesAt && (
        <p className="text-sm">
          Deadline {formatDateTime(event.registrationClosesAt)} WITA ·{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Masuk untuk mendaftar
          </Link>
        </p>
      )}
    </article>
  );
}

export function MedalCounts({
  counts,
  size = "md",
}: {
  counts: { GOLD: number; SILVER: number; BRONZE: number };
  size?: "md" | "lg";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {(["GOLD", "SILVER", "BRONZE"] as const).map((medal) => (
        <span
          key={medal}
          className={cn(
            "rounded-full font-medium",
            size === "lg" ? "px-4 py-2 text-base" : "px-3 py-1 text-sm",
            MEDAL_CLASS[medal],
          )}
        >
          {MEDAL_LABEL[medal]} <span className="numeric font-semibold">{counts[medal]}</span>
        </span>
      ))}
    </div>
  );
}

// Ajakan bergabung di akhir halaman.
export function CtaBand() {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-14 md:flex-row md:items-center md:justify-between md:px-8">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="font-heading text-2xl font-bold md:text-3xl">
            Siap bergabung dengan {SITE.shortName}?
          </h2>
          <p className="text-primary-foreground/85">
            Hubungi kami untuk jadwal uji coba latihan dan informasi pendaftaran anggota.
          </p>
        </div>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "secondary", size: "lg" })}
        >
          <MessageCircle />
          Hubungi via WhatsApp
        </a>
      </div>
    </section>
  );
}
