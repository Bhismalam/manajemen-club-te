"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";
import type { ResetPasswordInput } from "@/lib/validations/auth";
import { resetPasswordSchema } from "@/lib/validations/auth";

import { authErrorMessage } from "./auth-errors";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Better Auth mengarahkan ke sini dengan ?token=... atau ?error=INVALID_TOKEN.
  const token = searchParams.get("token");
  const tokenError = searchParams.get("error");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  if (!token || tokenError) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive">
          <AlertDescription>{authErrorMessage({ code: "INVALID_TOKEN" })}</AlertDescription>
        </Alert>
        <Link
          href="/forgot-password"
          className="text-center text-sm underline-offset-4 hover:underline"
        >
          Minta link reset baru
        </Link>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return;
    setFormError(null);
    const { error } = await authClient.resetPassword({ newPassword: values.password, token });
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }
    router.replace("/login?reset=success");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="password">Password baru</FieldLabel>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirmPassword">Ulangi password baru</FieldLabel>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
