"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { markAllNotificationsReadAction } from "./registration-actions";

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await markAllNotificationsReadAction();
          if (!result.success) toast.error(result.error.message);
        })
      }
    >
      {pending ? "Menandai…" : "Tandai semua dibaca"}
    </Button>
  );
}
