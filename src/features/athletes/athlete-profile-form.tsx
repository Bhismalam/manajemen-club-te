"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { GENDER_LABEL } from "@/constants/labels";
import { GENDER_VALUES } from "@/lib/validations/common";
import type { UpdateAthleteInput } from "@/lib/validations/profiles";
import { updateAthleteSchema } from "@/lib/validations/profiles";
import type { GroupOption } from "@/services/training-group-service";

import { updateAthleteAction } from "./athlete-actions";

export function AthleteProfileForm({
  defaults,
  groups,
}: {
  defaults: UpdateAthleteInput;
  groups: GroupOption[];
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateAthleteInput>({
    resolver: zodResolver(updateAthleteSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await updateAthleteAction(values);
        if (!result.success) {
          const { field, message } = result.error;
          if (field && field in defaults) setError(field as keyof UpdateAthleteInput, { message });
          else toast.error(message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        reset(values);
        router.refresh();
      })}
    >
      <FieldGroup>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.fullName)}>
            <FieldLabel htmlFor="fullName">Nama lengkap</FieldLabel>
            <Input
              id="fullName"
              aria-invalid={Boolean(errors.fullName)}
              {...register("fullName")}
            />
            <FieldError errors={[errors.fullName]} />
          </Field>
          <Field data-invalid={Boolean(errors.athleteNumber)}>
            <FieldLabel htmlFor="athleteNumber">Nomor atlet / KTA</FieldLabel>
            <Input
              id="athleteNumber"
              aria-invalid={Boolean(errors.athleteNumber)}
              {...register("athleteNumber")}
            />
            <FieldError errors={[errors.athleteNumber]} />
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
          <Field data-invalid={Boolean(errors.gender)}>
            <FieldLabel htmlFor="gender">Jenis kelamin</FieldLabel>
            <NativeSelect id="gender" className="w-full" {...register("gender")}>
              {GENDER_VALUES.map((value) => (
                <NativeSelectOption key={value} value={value}>
                  {GENDER_LABEL[value]}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldError errors={[errors.gender]} />
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
            <NativeSelect id="trainingGroupId" className="w-full" {...register("trainingGroupId")}>
              <NativeSelectOption value="">Belum ditentukan</NativeSelectOption>
              {groups.map((group) => (
                <NativeSelectOption key={group.id} value={group.id}>
                  {group.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <FieldDescription>
              Pelatih kelompok ini otomatis menjadi pembina atlet.
            </FieldDescription>
            <FieldError errors={[errors.trainingGroupId]} />
          </Field>
          <Field data-invalid={Boolean(errors.phone)}>
            <FieldLabel htmlFor="phone">Nomor HP (opsional)</FieldLabel>
            <Input id="phone" type="tel" {...register("phone")} />
            <FieldError errors={[errors.phone]} />
          </Field>
        </div>

        <Field orientation="horizontal" className="items-start">
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Checkbox
                id="isActive"
                className="mt-0.5"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <div className="flex flex-col gap-0.5">
            <FieldLabel htmlFor="isActive" className="font-normal">
              Atlet aktif
            </FieldLabel>
            <FieldDescription>
              Atlet nonaktif tidak bisa didaftarkan ke event dan tidak muncul di daftar pelatih.
              Akun loginnya diatur terpisah di halaman pengguna.
            </FieldDescription>
          </div>
        </Field>

        <Button type="submit" className="self-start" disabled={!isDirty || isSubmitting}>
          {isSubmitting ? "Menyimpan…" : "Simpan profil"}
        </Button>
      </FieldGroup>
    </form>
  );
}
