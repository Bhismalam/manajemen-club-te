import { BrandMark } from "@/components/dashboard/brand-mark";
import { ConnectionStatus } from "@/components/shared/connection-status";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="safe-area-page flex flex-1 flex-col items-center justify-center gap-6">
      <p className="flex items-center gap-3 text-lg font-semibold tracking-tight">
        <BrandMark className="size-10 shrink-0 text-primary" />
        TE
      </p>
      <div className="flex w-full max-w-sm flex-col gap-4">
        <ConnectionStatus />
        {children}
      </div>
    </main>
  );
}
