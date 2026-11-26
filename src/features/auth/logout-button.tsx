"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { LOGIN_PATH } from "@/lib/auth/routes";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    try {
      const { error } = await authClient.signOut();
      if (error) {
        toast.error("Gagal keluar. Silakan coba lagi.");
        return;
      }
      router.replace(LOGIN_PATH);
      router.refresh();
    } catch {
      toast.error("Gagal keluar. Periksa koneksi lalu coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="min-h-11"
      onClick={handleLogout}
      disabled={pending}
      aria-busy={pending}
    >
      <LogOut aria-hidden="true" />
      {pending ? "Keluar…" : "Keluar"}
    </Button>
  );
}
