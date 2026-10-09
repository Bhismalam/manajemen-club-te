"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth/auth-client";
import { DASHBOARD_PATH, LOGIN_PATH, safeCallbackUrl } from "@/lib/auth/routes";

import { authErrorMessage, RESTART_LOGIN_CODES } from "./auth-errors";

type Mode = "totp" | "backup";

export function TwoFactorForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("totp");
  const [code, setCode] = useState("");
  const [trustDevice, setTrustDevice] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; restart: boolean } | null>(null);

  async function verify(value: string) {
    if (pending) return;
    setPending(true);
    setError(null);

    const { error: authError } =
      mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: value, trustDevice })
        : await authClient.twoFactor.verifyBackupCode({ code: value.trim(), trustDevice });

    if (authError) {
      setError({
        message: authErrorMessage(authError),
        restart: Boolean(authError.code && RESTART_LOGIN_CODES.has(authError.code)),
      });
      setCode("");
      setPending(false);
      return;
    }

    router.replace(safeCallbackUrl(searchParams.get("callbackUrl")) ?? DASHBOARD_PATH);
    router.refresh();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setCode("");
    setError(null);
  }

  const canSubmit = mode === "totp" ? code.length === 6 : code.trim().length > 0;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void verify(code);
      }}
    >
      <FieldGroup>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              {error.message}{" "}
              {error.restart && (
                <Link href={LOGIN_PATH} className="font-medium underline underline-offset-4">
                  Masuk ulang
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {mode === "totp" ? (
          <Field>
            <FieldLabel htmlFor="totp">Kode authenticator</FieldLabel>
            <InputOTP
              id="totp"
              maxLength={6}
              inputMode="numeric"
              pattern="^[0-9]*$"
              autoComplete="one-time-code"
              autoFocus
              value={code}
              onChange={setCode}
              onComplete={(value: string) => void verify(value)}
              disabled={pending}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </Field>
        ) : (
          <Field>
            <FieldLabel htmlFor="backup-code">Recovery code</FieldLabel>
            <Input
              id="backup-code"
              autoComplete="off"
              autoFocus
              value={code}
              onChange={(event) => setCode(event.target.value)}
              disabled={pending}
            />
            <FieldDescription>Setiap recovery code hanya bisa dipakai sekali.</FieldDescription>
          </Field>
        )}

        <Field orientation="horizontal">
          <Checkbox
            id="trust-device"
            checked={trustDevice}
            onCheckedChange={(checked) => setTrustDevice(checked === true)}
          />
          <FieldLabel htmlFor="trust-device" className="font-normal">
            Percayai perangkat ini selama 30 hari (tidak berlaku untuk akun admin)
          </FieldLabel>
        </Field>

        <Button type="submit" className="w-full" disabled={!canSubmit || pending}>
          {pending ? "Memverifikasi…" : "Verifikasi"}
        </Button>

        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => switchMode(mode === "totp" ? "backup" : "totp")}
        >
          {mode === "totp"
            ? "Tidak bisa membuka authenticator? Pakai recovery code"
            : "Pakai kode authenticator"}
        </button>
      </FieldGroup>
    </form>
  );
}
