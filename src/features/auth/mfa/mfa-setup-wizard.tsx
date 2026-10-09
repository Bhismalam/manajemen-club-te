"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import QRCode from "react-qr-code";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { authClient } from "@/lib/auth/auth-client";
import { DASHBOARD_PATH } from "@/lib/auth/routes";

import { authErrorMessage } from "../auth-errors";
import { BackupCodesList } from "./backup-codes-list";
import { PasswordConfirmForm } from "./password-confirm-form";

type Step =
  | { name: "password" }
  | { name: "verify"; totpURI: string; backupCodes: string[] }
  | { name: "codes"; backupCodes: string[] };

function secretFromUri(totpURI: string): string {
  const secret = new URL(totpURI).searchParams.get("secret") ?? "";
  return secret.match(/.{1,4}/g)?.join(" ") ?? secret;
}

export function MfaSetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "password" });
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function verify(value: string, backupCodes: string[]) {
    if (pending) return;
    setPending(true);
    setError(null);
    const { error: authError } = await authClient.twoFactor.verifyTotp({ code: value });
    setPending(false);
    if (authError) {
      setError(authErrorMessage(authError));
      setCode("");
      return;
    }
    setStep({ name: "codes", backupCodes });
  }

  if (step.name === "password") {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Langkah 1 dari 3. Konfirmasi password untuk mulai mengaktifkan MFA.
        </p>
        <PasswordConfirmForm
          submitLabel="Lanjut"
          pendingLabel="Memproses…"
          onConfirm={async (password) => {
            const { data, error: authError } = await authClient.twoFactor.enable({ password });
            if (authError || data?.method !== "totp") return authErrorMessage(authError);
            setStep({ name: "verify", totpURI: data.totpURI, backupCodes: data.backupCodes });
            return null;
          }}
        />
      </div>
    );
  }

  if (step.name === "verify") {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-muted-foreground">
          Langkah 2 dari 3. Scan QR code ini dengan aplikasi authenticator (Google Authenticator,
          Microsoft Authenticator, Authy, 1Password, dll.).
        </p>
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-lg bg-white p-3">
            <QRCode value={step.totpURI} size={176} />
          </div>
          <div className="text-center text-sm">
            <p className="text-muted-foreground">
              Tidak bisa scan? Masukkan kode ini secara manual:
            </p>
            <code className="font-mono text-sm break-all">{secretFromUri(step.totpURI)}</code>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Field>
          <FieldLabel htmlFor="setup-totp">Masukkan kode 6 digit dari aplikasi</FieldLabel>
          <InputOTP
            id="setup-totp"
            maxLength={6}
            inputMode="numeric"
            pattern="^[0-9]*$"
            autoComplete="one-time-code"
            value={code}
            onChange={setCode}
            onComplete={(value: string) => void verify(value, step.backupCodes)}
            disabled={pending}
          >
            <InputOTPGroup>
              {Array.from({ length: 6 }, (_, index) => (
                <InputOTPSlot key={index} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
        </Field>
        <Button
          type="button"
          disabled={code.length !== 6 || pending}
          onClick={() => void verify(code, step.backupCodes)}
        >
          {pending ? "Memverifikasi…" : "Verifikasi"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Langkah 3 dari 3. MFA sudah aktif. Simpan recovery code berikut di tempat aman (password
        manager atau kertas). Setiap kode hanya bisa dipakai sekali saat kamu tidak bisa membuka
        aplikasi authenticator. Kode ini tidak akan ditampilkan lagi.
      </p>
      <BackupCodesList codes={step.backupCodes} />
      <Field orientation="horizontal">
        <Checkbox
          id="codes-saved"
          checked={saved}
          onCheckedChange={(checked) => setSaved(checked === true)}
        />
        <FieldLabel htmlFor="codes-saved" className="font-normal">
          Saya sudah menyimpan recovery code ini
        </FieldLabel>
      </Field>
      <Button
        type="button"
        disabled={!saved}
        onClick={() => {
          router.replace(DASHBOARD_PATH);
          router.refresh();
        }}
      >
        Selesai
      </Button>
    </div>
  );
}
