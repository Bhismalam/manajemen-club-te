import type { LucideIcon } from "lucide-react";
import Link from "next/link";

// Satu angka ringkasan dengan label; opsional menjadi link ke daftar terkait.
export function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p className="numeric text-3xl font-semibold text-foreground">{value}</p>
    </>
  );

  const className =
    "flex flex-col gap-3 rounded-xl border bg-card p-4 transition-colors outline-none";
  return href ? (
    <Link
      href={href}
      className={`${className} hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring`}
    >
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
