"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth/auth-client";

import { authErrorMessage } from "../auth-errors";
import { BackupCodesList } from "./backup-codes-list";
import { PasswordConfirmForm } from "./password-confirm-form";

export function RegenerateBackupCodes() {
  const [codes, setCodes] = useState<string[] | null>(null);

  if (codes) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Recovery code baru. Kode lama sudah tidak berlaku. Simpan di tempat aman.
        </p>
        <BackupCodesList codes={codes} />
      </div>
    );
  }

  return (
    <PasswordConfirmForm
      submitLabel="Buat recovery code baru"
      pendingLabel="Membuat…"
      onConfirm={async (password) => {
        const { data, error } = await authClient.twoFactor.generateBackupCodes({ password });
        if (error || !data) return authErrorMessage(error);
        setCodes(data.backupCodes);
        return null;
      }}
    />
  );
}

export function DisableMfa() {
  const router = useRouter();

  return (
    <PasswordConfirmForm
      submitLabel="Nonaktifkan MFA"
      pendingLabel="Menonaktifkan…"
      variant="destructive"
      onConfirm={async (password) => {
        const { error } = await authClient.twoFactor.disable({ password });
        if (error) return authErrorMessage(error);
        router.refresh();
        return null;
      }}
    />
  );
}
