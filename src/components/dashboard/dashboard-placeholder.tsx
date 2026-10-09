import { LogoutButton } from "@/features/auth/logout-button";
import type { CurrentUser } from "@/lib/auth/session";

// Sementara sampai app shell dashboard dibuat di Phase 4.
export function DashboardPlaceholder({ title, user }: { title: string; user: CurrentUser }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">
            Masuk sebagai {user.name} ({user.email})
          </p>
        </div>
        <LogoutButton />
      </header>
      <p className="text-sm text-muted-foreground">Konten dashboard menyusul di fase berikutnya.</p>
    </main>
  );
}

export function DashboardSkeleton() {
  return (
    <main
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-4 py-10"
      aria-busy="true"
    >
      <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-64 animate-pulse rounded-md bg-muted" />
    </main>
  );
}
