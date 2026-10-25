import type { Metadata } from "next";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/auth/change-password-form";
import { dashboardPathFor } from "@/lib/auth/routes";
import { requireSignedIn } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Buat Password Baru" };

export default function ChangePasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Buat password baru</CardTitle>
        <CardDescription>
          Password ini hanya kamu yang tahu, dipakai untuk login berikutnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-muted" />}>
          <Content />
        </Suspense>
      </CardContent>
    </Card>
  );
}

// Memakai requireSignedIn (bukan requireUser) agar tidak berputar ke halaman ini sendiri.
async function Content() {
  const user = await requireSignedIn();
  return (
    <div className="flex flex-col gap-4">
      {user.mustChangePassword && (
        <Alert>
          <AlertDescription>
            Kamu masih memakai password awal dari admin. Ganti dulu sebelum melanjutkan; isi
            &ldquo;Password saat ini&rdquo; dengan password awal tersebut.
          </AlertDescription>
        </Alert>
      )}
      <ChangePasswordForm redirectTo={dashboardPathFor(user.role)} />
    </div>
  );
}
