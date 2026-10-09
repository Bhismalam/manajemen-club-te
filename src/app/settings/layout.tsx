import Link from "next/link";

import { DASHBOARD_PATH } from "@/lib/auth/routes";

export default function SettingsLayout({ children }: LayoutProps<"/settings">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-10">
      <Link
        href={DASHBOARD_PATH}
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Kembali ke dashboard
      </Link>
      {children}
    </main>
  );
}
