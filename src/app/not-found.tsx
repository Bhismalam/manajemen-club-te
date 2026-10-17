import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <p className="numeric text-sm text-muted-foreground">404</p>
      <h1 className="text-2xl font-bold">Halaman tidak ditemukan</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Alamat ini tidak ada atau sudah dipindahkan. Periksa kembali link-nya.
      </p>
      <Link href="/dashboard" className={buttonVariants({ className: "mt-2" })}>
        Ke dashboard
      </Link>
    </main>
  );
}
