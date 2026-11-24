"use client";

import type { RefObject } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { useInstallApp } from "./install-app-provider";

export function InstallAppDialog({
  open,
  onOpenChange,
  returnFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnFocus: RefObject<HTMLElement | null>;
}) {
  const { platform, installed, canInstall, installing, message, install } = useInstallApp();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={returnFocus}>
        <DialogHeader className="pr-7">
          <DialogTitle>Pasang TE</DialogTitle>
          <DialogDescription>
            Buka TE dari ikon aplikasi untuk mengakses klubmu. TE tetap membutuhkan internet.
          </DialogDescription>
        </DialogHeader>
        {installed || platform === "standalone" ? (
          <p role="status">TE sudah terpasang. Buka melalui ikon aplikasi di perangkatmu.</p>
        ) : platform === "ios" ? (
          <ol className="list-decimal space-y-2 pl-5">
            <li>Buka TE di Safari.</li>
            <li>Ketuk menu Bagikan.</li>
            <li>Pilih Tambahkan ke Layar Utama (Add to Home Screen).</li>
            <li>Jika tersedia, aktifkan Buka sebagai App, lalu ketuk Tambah.</li>
          </ol>
        ) : canInstall ? (
          <p>Ketuk Pasang sekarang, lalu konfirmasi pemasangan pada jendela browser.</p>
        ) : (
          <div className="space-y-2">
            <p>Buka menu browser, lalu cari Pasang aplikasi atau Tambahkan ke Layar Utama.</p>
            <p className="text-muted-foreground">
              Jika pilihan tersebut belum tersedia, kamu tetap bisa memakai TE di browser.
            </p>
          </div>
        )}
        {message && (
          <p role="status" className="text-muted-foreground">
            {message}
          </p>
        )}
        <DialogFooter showCloseButton>
          {!installed && platform !== "standalone" && canInstall && (
            <Button onClick={install} disabled={installing}>
              {installing ? "Menunggu browser…" : "Pasang sekarang"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
