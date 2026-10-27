import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";
import { LOGIN_PATH } from "@/lib/auth/routes";
import { isEmailEnabled } from "@/services/email-service";

export const metadata: Metadata = { title: "Lupa Password" };

export default function ForgotPasswordPage() {
  // Tanpa layanan email, reset lewat link tidak bisa dikirim: arahkan ke admin klub.
  if (!isEmailEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Lupa password</CardTitle>
          <CardDescription>
            Hubungi admin klub. Admin akan membuatkan password sementara, lalu kamu diminta membuat
            password baru saat login.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href={LOGIN_PATH} className={buttonVariants({ variant: "outline" })}>
            Kembali ke login
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Lupa password</CardTitle>
        <CardDescription>
          Masukkan email akunmu. Kami akan mengirim link untuk membuat password baru.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
