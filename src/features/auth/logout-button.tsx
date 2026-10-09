"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/auth-client";
import { LOGIN_PATH } from "@/lib/auth/routes";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await authClient.signOut();
    router.replace(LOGIN_PATH);
    router.refresh();
  }

  return (
    <Button variant="outline" onClick={handleLogout} disabled={pending}>
      {pending ? "Keluar…" : "Keluar"}
    </Button>
  );
}
