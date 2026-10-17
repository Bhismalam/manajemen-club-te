"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { TrainingGroupInput } from "@/lib/validations/groups";
import { trainingGroupSchema } from "@/lib/validations/groups";
import type { CoachOption } from "@/services/coach-service";

import {
  createTrainingGroupAction,
  deleteTrainingGroupAction,
  updateTrainingGroupAction,
} from "./group-actions";

// Form tambah (tanpa groupId) dan edit (dengan groupId) kelompok latihan.
export function GroupForm({
  groupId,
  defaults,
  coaches,
}: {
  groupId?: string;
  defaults: TrainingGroupInput;
  coaches: CoachOption[];
}) {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<TrainingGroupInput>({
    resolver: zodResolver(trainingGroupSchema),
    defaultValues: defaults,
  });

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        const result = groupId
          ? await updateTrainingGroupAction({ ...values, groupId })
          : await createTrainingGroupAction(values);
        if (!result.success) {
          const { field, message } = result.error;
          if (field === "name" || field === "coachId") setError(field, { message });
          else toast.error(message);
          return;
        }
        toast.success(result.message ?? "Tersimpan.");
        if (groupId) {
          reset(values);
          router.refresh();
        } else if (result.data && typeof result.data === "object" && "id" in result.data) {
          router.push(`/admin/groups/${result.data.id}`);
        }
      })}
      className="max-w-xl"
    >
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="name">Nama kelompok</FieldLabel>
          <Input
            id="name"
            placeholder="mis. Junior Swimming"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          <FieldError errors={[errors.name]} />
        </Field>
        <Field data-invalid={Boolean(errors.coachId)}>
          <FieldLabel htmlFor="coachId">Pelatih</FieldLabel>
          <NativeSelect id="coachId" className="w-full" {...register("coachId")}>
            <NativeSelectOption value="">Belum ada pelatih</NativeSelectOption>
            {coaches.map((coach) => (
              <NativeSelectOption key={coach.id} value={coach.id}>
                {coach.fullName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>
            Pelatih ini bisa melihat dan mencatat data semua atlet di kelompok.
          </FieldDescription>
          <FieldError errors={[errors.coachId]} />
        </Field>
        <Field data-invalid={Boolean(errors.description)}>
          <FieldLabel htmlFor="description">Deskripsi (opsional)</FieldLabel>
          <Textarea
            id="description"
            placeholder="mis. Atlet renang usia 10–14"
            {...register("description")}
          />
          <FieldError errors={[errors.description]} />
        </Field>
        <Button
          type="submit"
          className="self-start"
          disabled={(groupId && !isDirty) || isSubmitting}
        >
          {isSubmitting ? "Menyimpan…" : groupId ? "Simpan perubahan" : "Buat kelompok"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function DeleteGroupButton({
  groupId,
  groupName,
  blockedReason,
}: {
  groupId: string;
  groupName: string;
  blockedReason: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="destructive"
        className="self-start"
        disabled={Boolean(blockedReason)}
        onClick={() => setOpen(true)}
      >
        Hapus kelompok
      </Button>
      {blockedReason && <p className="text-sm text-muted-foreground">{blockedReason}</p>}
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Hapus kelompok ${groupName}?`}
        description="Kelompok yang dihapus tidak bisa dikembalikan."
        confirmLabel="Hapus"
        pendingLabel="Menghapus…"
        destructive
        onConfirm={async () => {
          const result = await deleteTrainingGroupAction({ groupId });
          if (!result.success) {
            toast.error(result.error.message);
            return false;
          }
          toast.success(result.message ?? "Dihapus.");
          router.push("/admin/groups");
          return true;
        }}
      />
    </div>
  );
}
