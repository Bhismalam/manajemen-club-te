"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Password awal hanya ditampilkan sekali; admin menyerahkannya langsung ke pengguna.
export function TemporaryPasswordDialog({
  open,
  email,
  password,
  onDone,
  title = "Akun dibuat",
}: {
  open: boolean;
  email: string;
  password: string;
  onDone: () => void;
  title?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDone()}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Serahkan email dan password awal ini ke pengguna. Password tidak akan ditampilkan lagi.
            Saat login berikutnya, pengguna langsung diminta membuat password baru.
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-lg border bg-muted/40 p-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="font-medium break-all">{email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Password awal</dt>
            <dd className="numeric text-base font-semibold tracking-wider">{password}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={async () => {
              await navigator.clipboard.writeText(`Email: ${email}\nPassword: ${password}`);
              setCopied(true);
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Tersalin" : "Salin"}
          </Button>
          <Button onClick={onDone}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
