import { Skeleton } from "@/components/ui/skeleton";

// Placeholder saat halaman dashboard memuat data (loading.tsx / Suspense fallback).
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat halaman">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56 motion-reduce:animate-none" />
        <Skeleton className="h-4 w-80 max-w-full motion-reduce:animate-none" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl motion-reduce:animate-none" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl motion-reduce:animate-none" />
    </div>
  );
}
