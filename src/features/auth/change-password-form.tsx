"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/auth-client";
import type { ChangePasswordInput } from "@/lib/validations/auth";
import { changePasswordSchema } from "@/lib/validations/auth";

import { authErrorMessage } from "./auth-errors";

// `redirectTo`: setelah berhasil, pindah ke halaman ini (dipakai alur wajib ganti password).
export function ChangePasswordForm({ redirectTo }: { redirectTo?: string } = {}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", password: "", confirmPassword: "" },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const { error } = await authClient.changePassword({
          currentPassword: values.currentPassword,
          newPassword: values.password,
          revokeOtherSessions: true,
        });
        if (error) {
          const message = authErrorMessage(error);
          if (error.code === "INVALID_PASSWORD") setError("currentPassword", { message });
          else toast.error(message);
          return;
        }
        reset();
        toast.success("Password diganti. Perangkat lain sudah dikeluarkan.");
        if (redirectTo) {
          // Navigasi penuh: session baru saja diganti, dan cache router client masih menyimpan
          // redirect lama ke halaman ini.
          window.location.assign(redirectTo);
        }
      })}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.currentPassword)}>
          <FieldLabel htmlFor="currentPassword">Password saat ini</FieldLabel>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            aria-invalid={Boolean(errors.currentPassword)}
            {...register("currentPassword")}
          />
          <FieldError errors={[errors.currentPassword]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="newPassword">Password baru</FieldLabel>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={Boolean(errors.confirmPassword)}>
          <FieldLabel htmlFor="confirmNewPassword">Ulangi password baru</FieldLabel>
          <Input
            id="confirmNewPassword"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          <FieldError errors={[errors.confirmPassword]} />
        </Field>
        <Button type="submit" className="self-start" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Ganti password"}
        </Button>
      </FieldGroup>
    </form>
  );
}
