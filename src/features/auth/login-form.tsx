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
import { DASHBOARD_PATH, safeCallbackUrl, TWO_FACTOR_PATH } from "@/lib/auth/routes";
import type { LoginInput } from "@/lib/validations/auth";
import { loginSchema } from "@/lib/validations/auth";

import { authErrorMessage } from "./auth-errors";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const passwordWasReset = searchParams.get("reset") === "success";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const { data, error } = await authClient.signIn.email(values);
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }

    const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl")) ?? DASHBOARD_PATH;
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) {
      router.push(`${TWO_FACTOR_PATH}?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    router.replace(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {passwordWasReset && !formError && (
          <Alert>
            <AlertDescription>
              Password berhasil diubah. Silakan masuk dengan password baru.
            </AlertDescription>
          </Alert>
        )}
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

        <Field data-invalid={Boolean(errors.password)}>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Lupa password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Memproses…" : "Masuk"}
        </Button>
      </FieldGroup>
    </form>
  );
}
