"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";
import type { ForgotPasswordInput } from "@/lib/validations/auth";
import { forgotPasswordSchema } from "@/lib/validations/auth";

import { authErrorMessage } from "./auth-errors";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
      redirectTo: "/reset-password",
    });
    // Pesan sukses sama untuk email terdaftar maupun tidak, agar tidak membocorkan daftar akun.
    if (error && error.status === 429) {
      setFormError(authErrorMessage(error));
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <Alert>
          <AlertDescription>
            Jika email tersebut terdaftar, link reset password sudah dikirim. Link berlaku 30 menit.
          </AlertDescription>
        </Alert>
        <Link href="/login" className="text-center text-sm underline-offset-4 hover:underline">
          Kembali ke halaman masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          <FieldError errors={[errors.email]} />
        </Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Mengirim…" : "Kirim link reset"}
        </Button>
        <Link
          href="/login"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          Kembali ke halaman masuk
        </Link>
      </FieldGroup>
    </form>
  );
}
