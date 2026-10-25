import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

// Bagian dashboard: judul, tautan "lihat semua" (opsional), dan isi.
export function SectionCard({
  title,
  description,
  href,
  linkLabel = "Lihat semua",
  className,
  children,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-3 rounded-xl border bg-card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className="flex shrink-0 items-center gap-0.5 rounded-sm text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
          >
            {linkLabel}
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

// Teks kosong ringkas di dalam SectionCard.
export function SectionEmpty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-sm text-muted-foreground">{children}</p>;
}
