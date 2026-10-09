import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TwoFactorForm } from "@/features/auth/two-factor-form";

export const metadata: Metadata = { title: "Verifikasi MFA" };

export default function TwoFactorPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Verifikasi dua langkah</CardTitle>
        <CardDescription>Masukkan kode 6 digit dari aplikasi authenticator.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <TwoFactorForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
