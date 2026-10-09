import type { Metadata } from "next";
import { Suspense } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form";

export const metadata: Metadata = { title: "Reset Password" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Buat password baru</CardTitle>
        <CardDescription>
          Password minimal 8 karakter. Setelah diubah, semua sesi login lain akan keluar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
