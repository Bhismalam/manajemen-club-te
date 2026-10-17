"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

// Dipakai oleh error.tsx. Detail teknis hanya ke console/log, pengguna melihat pesan umum
// beserta kode referensi (digest) untuk dilaporkan ke admin (doc/SECURITY.md §16).
export function ErrorState({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Empty className="flex-none rounded-xl border bg-card py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <CircleAlert />
        </EmptyMedia>
        <EmptyTitle>Halaman ini gagal dimuat</EmptyTitle>
        <EmptyDescription>
          Coba muat ulang. Jika masih gagal, laporkan ke admin klub
          {error.digest ? (
            <>
              {" "}
              dengan kode <span className="numeric text-foreground">{error.digest}</span>
            </>
          ) : null}
          .
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" onClick={retry}>
          <RotateCcw />
          Muat ulang
        </Button>
      </EmptyContent>
    </Empty>
  );
}
