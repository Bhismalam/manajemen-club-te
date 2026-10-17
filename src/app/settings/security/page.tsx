import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { DisableMfa, RegenerateBackupCodes } from "@/features/auth/mfa/mfa-manage";
import { MFA_SETUP_PATH } from "@/lib/auth/routes";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Keamanan Akun" };

export default function SecuritySettingsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Keamanan akun</h1>
      <Card>
        <CardHeader>
          <CardTitle>Ganti password</CardTitle>
          <CardDescription>
            Wajib dilakukan setelah pertama kali masuk dengan password dari admin. Perangkat lain
            akan dikeluarkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-muted" />}>
        <MfaSection />
      </Suspense>
    </>
  );
}

async function MfaSection() {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Verifikasi dua langkah (MFA)</CardTitle>
        <CardDescription>
          Status:{" "}
          <span className="font-medium text-foreground">
            {user.twoFactorEnabled ? "Aktif" : "Tidak aktif"}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {!user.twoFactorEnabled ? (
          <>
            {isAdmin && (
              <Alert variant="destructive">
                <AlertDescription>
                  MFA wajib untuk akun admin. Aktifkan sekarang untuk bisa membuka dashboard admin.
                </AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              Selain password, login akan meminta kode 6 digit dari aplikasi authenticator di HP.
            </p>
            <Link href={MFA_SETUP_PATH} className={buttonVariants({ className: "self-start" })}>
              Aktifkan MFA
            </Link>
          </>
        ) : (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="font-medium">Recovery code</h2>
              <p className="text-sm text-muted-foreground">
                Buat recovery code baru jika kode lama hilang atau hampir habis. Kode lama otomatis
                tidak berlaku.
              </p>
              <RegenerateBackupCodes />
            </section>
            <Separator />
            <section className="flex flex-col gap-3">
              <h2 className="font-medium">Nonaktifkan MFA</h2>
              {isAdmin ? (
                <p className="text-sm text-muted-foreground">
                  MFA wajib untuk akun admin dan tidak bisa dinonaktifkan. Jika kehilangan perangkat
                  dan recovery code, minta admin lain untuk mereset MFA kamu.
                </p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Akun akan kembali hanya memakai password.
                  </p>
                  <DisableMfa />
                </>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
