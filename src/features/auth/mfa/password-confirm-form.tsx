"use client";

import { useId, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

// Form kecil "masukkan password" untuk aksi MFA yang sensitif.
export function PasswordConfirmForm({
  submitLabel,
  pendingLabel,
  variant = "default",
  onConfirm,
}: {
  submitLabel: string;
  pendingLabel: string;
  variant?: "default" | "destructive";
  // Mengembalikan pesan error, atau null jika berhasil.
  onConfirm: (password: string) => Promise<string | null>;
}) {
  const id = useId();
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!password) return;
        setPending(true);
        setError(null);
        const message = await onConfirm(password);
        setPending(false);
        if (message) setError(message);
        else setPassword("");
      }}
    >
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Field>
          <FieldLabel htmlFor={id}>Password akun</FieldLabel>
          <Input
            id={id}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
          />
        </Field>
        <Button type="submit" variant={variant} disabled={!password || pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
