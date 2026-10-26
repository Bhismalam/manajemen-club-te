"use client";

import { ErrorState } from "@/components/shared/error-state";

// Error boundary untuk halaman publik, login, dan pengaturan akun. Pesan umum saja;
// detail teknis tidak ditampilkan ke pengguna (doc/SECURITY.md §16).
export default function Error(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10">
      <ErrorState {...props} />
    </main>
  );
}
