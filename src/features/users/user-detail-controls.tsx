"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { ROLE_LABEL, USER_STATUS_LABEL } from "@/constants/labels";
import type { UserRole, UserStatus } from "@/generated/prisma/enums";
import type { ActionResult } from "@/lib/errors";
import { ROLE_VALUES, USER_STATUS_VALUES } from "@/lib/validations/common";
import type { UpdateUserAccountInput } from "@/lib/validations/users";
import { updateUserAccountSchema } from "@/lib/validations/users";

import { resetUserMfaAction } from "./mfa-actions";
import { TemporaryPasswordDialog } from "./temporary-password-dialog";
import {
  resetUserPasswordAction,
  setUserRoleAction,
  setUserStatusAction,
  updateUserAccountAction,
} from "./user-actions";

// Tampilkan hasil action sebagai toast; true jika berhasil. Data halaman diperbarui oleh
// `refresh()` di dalam action.
function feedback(result: ActionResult) {
  if (!result.success) {
    toast.error(result.error.message);
    return false;
  }
  if (result.message) toast.success(result.message);
  return true;
}

// ---------------------------------------------------------------------------

export function UserAccountForm({ user }: { user: { id: string; name: string; email: string } }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<UpdateUserAccountInput>({
    resolver: zodResolver(updateUserAccountSchema),
    defaultValues: { userId: user.id, name: user.name, email: user.email },
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await updateUserAccountAction(values);
        if (!result.success && result.error.field === "email") {
          setError("email", { message: result.error.message });
          return;
        }
        if (feedback(result)) reset(values);
      })}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel htmlFor="account-name">Nama</FieldLabel>
            <Input id="account-name" aria-invalid={Boolean(errors.name)} {...register("name")} />
            <FieldError errors={[errors.name]} />
          </Field>
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="account-email">Email login</FieldLabel>
            <Input
              id="account-email"
              type="email"
              aria-invalid={Boolean(errors.email)}
              {...register("email")}
            />
            <FieldError errors={[errors.email]} />
          </Field>
        </div>
        <Button type="submit" className="self-start" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan perubahan"}
        </Button>
      </FieldGroup>
    </form>
  );
}

// ---------------------------------------------------------------------------

export function UserStatusControl({
  userId,
  status,
  disabled,
}: {
  userId: string;
  status: UserStatus;
  disabled: boolean;
}) {
  const id = useId();
  const [next, setNext] = useState<UserStatus>(status);
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const deactivating = next !== "ACTIVE";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field className="sm:w-56">
          <FieldLabel htmlFor={`${id}-status`}>Status akun</FieldLabel>
          <NativeSelect
            id={`${id}-status`}
            className="w-full"
            value={next}
            disabled={disabled}
            onChange={(event) => setNext(event.target.value as UserStatus)}
          >
            {USER_STATUS_VALUES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {USER_STATUS_LABEL[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Button
          variant={deactivating ? "destructive" : "default"}
          disabled={disabled || next === status}
          onClick={() => setOpen(true)}
        >
          Ubah status
        </Button>
      </div>
      <FieldDescription>
        Akun nonaktif atau ditangguhkan tidak bisa masuk, dan semua sesi loginnya langsung diakhiri.
      </FieldDescription>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Ubah status menjadi ${USER_STATUS_LABEL[next].toLowerCase()}?`}
        description={
          deactivating
            ? "Pengguna langsung keluar dari semua perangkat dan tidak bisa masuk sampai diaktifkan lagi."
            : "Pengguna bisa masuk kembali dengan password yang sama."
        }
        confirmLabel="Ubah status"
        pendingLabel="Menyimpan…"
        destructive={deactivating}
        disabled={deactivating && reason.trim().length < 3}
        onConfirm={async () =>
          feedback(await setUserStatusAction({ userId, status: next, reason }))
        }
      >
        {deactivating && (
          <Field>
            <FieldLabel htmlFor={`${id}-reason`}>Alasan</FieldLabel>
            <Textarea
              id={`${id}-reason`}
              value={reason}
              maxLength={200}
              onChange={(event) => setReason(event.target.value)}
              placeholder="mis. Sudah tidak aktif berlatih di klub"
            />
          </Field>
        )}
      </ConfirmDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function UserRoleControl({
  userId,
  role,
  disabled,
}: {
  userId: string;
  role: UserRole;
  disabled: boolean;
}) {
  const id = useId();
  const [next, setNext] = useState<UserRole>(role);
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <Field className="sm:w-56">
          <FieldLabel htmlFor={`${id}-role`}>Role</FieldLabel>
          <NativeSelect
            id={`${id}-role`}
            className="w-full"
            value={next}
            disabled={disabled}
            onChange={(event) => setNext(event.target.value as UserRole)}
          >
            {ROLE_VALUES.map((value) => (
              <NativeSelectOption key={value} value={value}>
                {ROLE_LABEL[value]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Button
          variant="outline"
          disabled={disabled || next === role}
          onClick={() => setOpen(true)}
        >
          Ubah role
        </Button>
      </div>
      <FieldDescription>
        Role pelatih/atlet butuh profil yang sesuai. Admin baru wajib mengaktifkan MFA.
      </FieldDescription>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Ubah role menjadi ${ROLE_LABEL[next]}?`}
        description="Akses pengguna langsung berubah sesuai role baru."
        confirmLabel="Ubah role"
        pendingLabel="Menyimpan…"
        onConfirm={async () => feedback(await setUserRoleAction({ userId, role: next }))}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ResetMfaControl({ userId, disabled }: { userId: string; disabled: boolean }) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        className="self-start"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Reset MFA
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Reset MFA pengguna ini?"
        description="Aplikasi authenticator dan recovery code lama tidak berlaku lagi, dan pengguna keluar dari semua perangkat. Pakai jika pengguna kehilangan HP dan recovery code."
        confirmLabel="Reset MFA"
        pendingLabel="Mereset…"
        destructive
        disabled={reason.trim().length < 3}
        onConfirm={async () => feedback(await resetUserMfaAction({ userId, reason }))}
      >
        <Field>
          <FieldLabel htmlFor={`${id}-mfa-reason`}>Alasan</FieldLabel>
          <Textarea
            id={`${id}-mfa-reason`}
            value={reason}
            maxLength={200}
            onChange={(event) => setReason(event.target.value)}
            placeholder="mis. HP hilang, sudah dikonfirmasi langsung"
          />
        </Field>
      </ConfirmDialog>
    </>
  );
}

// ---------------------------------------------------------------------------

// Pengguna lupa password: admin membuat password sementara yang ditampilkan sekali.
export function ResetPasswordControl({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<{ email: string; temporaryPassword: string } | null>(null);

  return (
    <>
      <Button
        variant="outline"
        className="self-start"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        Buat password sementara
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Buat password sementara?"
        description="Password lama tidak berlaku lagi dan pengguna keluar dari semua perangkat. Berikan password sementara langsung ke pengguna; ia wajib menggantinya saat login."
        confirmLabel="Buat password"
        pendingLabel="Membuat…"
        destructive
        onConfirm={async () => {
          const result = await resetUserPasswordAction({ userId });
          if (!result.success) {
            toast.error(result.error.message);
            return false;
          }
          setIssued(result.data);
          return true;
        }}
      />
      {issued && (
        <TemporaryPasswordDialog
          open
          title="Password sementara dibuat"
          email={issued.email}
          password={issued.temporaryPassword}
          onDone={() => setIssued(null)}
        />
      )}
    </>
  );
}
