"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { UpdateCoachInput } from "@/lib/validations/profiles";
import { updateCoachSchema } from "@/lib/validations/profiles";

import { updateCoachAction } from "./coach-actions";

export function CoachProfileForm({ defaults }: { defaults: UpdateCoachInput }) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateCoachInput>({
    resolver: zodResolver(updateCoachSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = await updateCoachAction(values);
        if (!result.success) {
          toast.error(result.error.message);
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
          <Field data-invalid={Boolean(errors.specialization)}>
            <FieldLabel htmlFor="specialization">Spesialisasi (opsional)</FieldLabel>
            <Input id="specialization" {...register("specialization")} />
            <FieldError errors={[errors.specialization]} />
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
              Pelatih aktif
            </FieldLabel>
            <FieldDescription>
              Pelatih nonaktif kehilangan akses ke data atlet binaannya.
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
