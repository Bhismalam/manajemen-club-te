"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { GENDER_LABEL, ROLE_LABEL } from "@/constants/labels";
import { GENDER_VALUES, ROLE_VALUES } from "@/lib/validations/common";
import type { CreateUserInput } from "@/lib/validations/users";
import { createUserSchema } from "@/lib/validations/users";
import type { GroupOption } from "@/services/training-group-service";

import { TemporaryPasswordDialog } from "./temporary-password-dialog";
import { createUserAction } from "./user-actions";

const DEFAULTS: CreateUserInput = {
  role: "ATHLETE",
  name: "",
  email: "",
  phone: "",
  specialization: "",
  athleteNumber: "",
  birthDate: "",
  gender: "",
  joinDate: new Date().toISOString().slice(0, 10),
  trainingGroupId: "",
};

export function CreateUserForm({
  groups,
  initialRole,
}: {
  groups: GroupOption[];
  initialRole: CreateUserInput["role"];
}) {
  const router = useRouter();
  const [created, setCreated] = useState<{
    userId: string;
    email: string;
    password: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { ...DEFAULTS, role: initialRole },
  });
  const role = useWatch({ control, name: "role" });

  async function onSubmit(values: CreateUserInput) {
    const result = await createUserAction(values);
    if (!result.success) {
      const { field, message } = result.error;
      if (field && field in DEFAULTS) setError(field as keyof CreateUserInput, { message });
      else toast.error(message);
      return;
    }
    setCreated({
      userId: result.data.userId,
      email: values.email,
      password: result.data.temporaryPassword,
    });
  }

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl">
        <FieldGroup>
          <FieldSet>
            <FieldLegend>Akun</FieldLegend>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.role)}>
                <FieldLabel htmlFor="role">Role</FieldLabel>
                <NativeSelect id="role" className="w-full sm:w-64" {...register("role")}>
                  {ROLE_VALUES.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {ROLE_LABEL[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {role === "ADMIN" && (
                  <FieldDescription>
                    Admin wajib mengaktifkan MFA saat pertama kali masuk.
                  </FieldDescription>
                )}
                <FieldError errors={[errors.role]} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.name)}>
                  <FieldLabel htmlFor="name">Nama lengkap</FieldLabel>
                  <Input
                    id="name"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    {...register("name")}
                  />
                  <FieldError errors={[errors.name]} />
                </Field>
                <Field data-invalid={Boolean(errors.email)}>
                  <FieldLabel htmlFor="email">Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.email)}
                    {...register("email")}
                  />
                  <FieldError errors={[errors.email]} />
                </Field>
              </div>
            </FieldGroup>
          </FieldSet>

          {role === "ATHLETE" && (
            <FieldSet>
              <FieldLegend>Profil atlet</FieldLegend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.athleteNumber)}>
                  <FieldLabel htmlFor="athleteNumber">Nomor atlet / KTA</FieldLabel>
                  <Input
                    id="athleteNumber"
                    autoComplete="off"
                    aria-invalid={Boolean(errors.athleteNumber)}
                    {...register("athleteNumber")}
                  />
                  <FieldError errors={[errors.athleteNumber]} />
                </Field>
                <Field data-invalid={Boolean(errors.gender)}>
                  <FieldLabel htmlFor="gender">Jenis kelamin</FieldLabel>
                  <NativeSelect
                    id="gender"
                    className="w-full"
                    aria-invalid={Boolean(errors.gender)}
                    {...register("gender")}
                  >
                    <NativeSelectOption value="">Pilih…</NativeSelectOption>
                    {GENDER_VALUES.map((value) => (
                      <NativeSelectOption key={value} value={value}>
                        {GENDER_LABEL[value]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldError errors={[errors.gender]} />
                </Field>
                <Field data-invalid={Boolean(errors.birthDate)}>
                  <FieldLabel htmlFor="birthDate">Tanggal lahir</FieldLabel>
                  <Input
                    id="birthDate"
                    type="date"
                    aria-invalid={Boolean(errors.birthDate)}
                    {...register("birthDate")}
                  />
                  <FieldError errors={[errors.birthDate]} />
                </Field>
                <Field data-invalid={Boolean(errors.joinDate)}>
                  <FieldLabel htmlFor="joinDate">Tanggal bergabung</FieldLabel>
                  <Input
                    id="joinDate"
                    type="date"
                    aria-invalid={Boolean(errors.joinDate)}
                    {...register("joinDate")}
                  />
                  <FieldError errors={[errors.joinDate]} />
                </Field>
                <Field data-invalid={Boolean(errors.trainingGroupId)}>
                  <FieldLabel htmlFor="trainingGroupId">Kelompok latihan</FieldLabel>
                  <NativeSelect
                    id="trainingGroupId"
                    className="w-full"
                    {...register("trainingGroupId")}
                  >
                    <NativeSelectOption value="">Belum ditentukan</NativeSelectOption>
                    {groups.map((group) => (
                      <NativeSelectOption key={group.id} value={group.id}>
                        {group.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                  <FieldDescription>Menentukan pelatih yang membina atlet ini.</FieldDescription>
                  <FieldError errors={[errors.trainingGroupId]} />
                </Field>
                <Field data-invalid={Boolean(errors.phone)}>
                  <FieldLabel htmlFor="phone">Nomor HP (opsional)</FieldLabel>
                  <Input id="phone" type="tel" autoComplete="off" {...register("phone")} />
                  <FieldError errors={[errors.phone]} />
                </Field>
              </div>
            </FieldSet>
          )}

          {role === "COACH" && (
            <FieldSet>
              <FieldLegend>Profil pelatih</FieldLegend>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field data-invalid={Boolean(errors.specialization)}>
                  <FieldLabel htmlFor="specialization">Spesialisasi (opsional)</FieldLabel>
                  <Input
                    id="specialization"
                    placeholder="mis. Finswimming"
                    {...register("specialization")}
                  />
                  <FieldError errors={[errors.specialization]} />
                </Field>
                <Field data-invalid={Boolean(errors.phone)}>
                  <FieldLabel htmlFor="phone">Nomor HP (opsional)</FieldLabel>
                  <Input id="phone" type="tel" autoComplete="off" {...register("phone")} />
                  <FieldError errors={[errors.phone]} />
                </Field>
              </div>
            </FieldSet>
          )}

          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Membuat akun…" : "Buat akun"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              disabled={isSubmitting}
            >
              Batal
            </Button>
          </div>
        </FieldGroup>
      </form>

      {created && (
        <TemporaryPasswordDialog
          open
          email={created.email}
          password={created.password}
          onDone={() => router.push(`/admin/users/${created.userId}`)}
        />
      )}
    </>
  );
}
