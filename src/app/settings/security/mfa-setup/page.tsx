import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MfaSetupWizard } from "@/features/auth/mfa/mfa-setup-wizard";
import { SECURITY_SETTINGS_PATH } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Aktifkan MFA" };

export default function MfaSetupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Aktifkan verifikasi dua langkah</CardTitle>
        <CardDescription>
          Lindungi akun dengan kode dari aplikasi authenticator di HP.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-muted" />}>
          <MfaSetupContent />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function MfaSetupContent() {
  const user = await requireUser();

  if (user.twoFactorEnabled) {
    return (
      <p className="text-sm">
        MFA sudah aktif.{" "}
        <Link href={SECURITY_SETTINGS_PATH} className="underline underline-offset-4">
          Kelola di pengaturan keamanan
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {user.role === "ADMIN" && (
        <Alert>
          <AlertDescription>
            Akun admin wajib memakai MFA sebelum bisa membuka dashboard admin.
          </AlertDescription>
        </Alert>
      )}
      <MfaSetupWizard />
    </div>
  );
}
