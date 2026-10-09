"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function BackupCodesList({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  const text = codes.join("\n");

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  function download() {
    const blob = new Blob([`Recovery codes — Swim & Finswimming Club\n\n${text}\n`], {
      type: "text/plain",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-sm">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>
          {copied ? "Tersalin" : "Salin"}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download}>
          Download .txt
        </Button>
      </div>
    </div>
  );
}
