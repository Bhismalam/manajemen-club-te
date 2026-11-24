// Smoke test Supabase Storage asli tanpa mengakses database aplikasi.
// Hanya membuat objek di prefix unik milik run ini, lalu menghapusnya di finally.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import { currentClubMonth } from "../src/lib/spp";
import {
  checkProofFile,
  detectProofType,
  PROOF_BUCKET,
  PROOF_MAX_BYTES,
  PROOF_MIME_TYPES,
  proofKeyFor,
} from "../src/lib/storage/payment-proof";

config({ path: [".env.local", ".env"], quiet: true });

const fixtures = [
  {
    type: "image/png",
    bytes: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
      "base64",
    ),
  },
  { type: "application/pdf", bytes: Buffer.from("%PDF-1.4\n% Storage smoke test\n%%EOF\n") },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && secret, "Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local.");
  const origin = new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000").origin;
  const storage = createClient(url, secret, { auth: { persistSession: false } }).storage;
  const bucket = storage.from(PROOF_BUCKET);
  const { data: spec, error: specError } = await storage.getBucket(PROOF_BUCKET);
  assert(!specError && spec, "Bucket payment-proofs belum tersedia; jalankan pnpm storage:setup.");
  assert.equal(spec.public, false, "Bucket bukti wajib privat.");
  assert.equal(Number(spec.file_size_limit), PROOF_MAX_BYTES, "Batas bucket wajib 10 MB.");
  assert.deepEqual([...(spec.allowed_mime_types ?? [])].sort(), [...PROOF_MIME_TYPES].sort());
  console.log("Lolos: bucket privat, batas 10 MB, dan daftar MIME foto/PDF.");

  const athleteId = `storage-verification-${randomUUID()}`;
  const month = currentClubMonth();
  const keys: string[] = [];
  // Jangan mencetak signed URL, token, atau response body dari Storage.
  const request = (target: string, init?: RequestInit) =>
    fetch(target, { ...init, signal: AbortSignal.timeout(30_000) });

  try {
    for (const fixture of fixtures) {
      const check = checkProofFile({ size: fixture.bytes.length, type: fixture.type });
      assert(check.ok);
      const key = proofKeyFor(athleteId, month, check.extension);
      keys.push(key);
      const { data: ticket, error: ticketError } = await bucket.createSignedUploadUrl(key);
      assert(!ticketError && ticket, "Gagal membuat signed upload URL.");

      const preflight = await request(ticket.signedUrl, {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "PUT",
          "Access-Control-Request-Headers": "content-type,x-upsert",
        },
      });
      assert(preflight.ok, "Preflight CORS gagal.");
      assert(["*", origin].includes(preflight.headers.get("access-control-allow-origin") ?? ""));
      assert.match(preflight.headers.get("access-control-allow-methods") ?? "", /PUT/i);
      const allowedHeaders = preflight.headers.get("access-control-allow-headers") ?? "";
      assert.match(allowedHeaders, /content-type/i);
      assert.match(allowedHeaders, /x-upsert/i);

      const upload = await request(ticket.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": fixture.type, "x-upsert": "false", Origin: origin },
        body: new Uint8Array(fixture.bytes),
      });
      assert(upload.ok, `Upload ${fixture.type} gagal (HTTP ${upload.status}).`);
      const duplicate = await request(ticket.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": fixture.type, "x-upsert": "false" },
        body: new Uint8Array(fixture.bytes),
      });
      assert(!duplicate.ok, "Signed upload tidak boleh menimpa objek yang sudah ada.");

      const { data: blob, error: downloadError } = await bucket.download(key);
      assert(!downloadError && blob, "Server gagal membaca objek yang diunggah.");
      const stored = Buffer.from(await blob.arrayBuffer());
      assert.deepEqual(stored, fixture.bytes, "Isi file berubah setelah upload.");
      assert.equal(detectProofType(stored), check.extension, "Signature isi file tidak cocok.");

      const anonymous = await request(bucket.getPublicUrl(key).data.publicUrl);
      assert(!anonymous.ok, "Bukti tidak boleh diakses melalui URL publik.");
      const { data: link, error: linkError } = await bucket.createSignedUrl(key, 300);
      assert(!linkError && link, "Gagal membuat signed read URL.");
      const signedRead = await request(link.signedUrl);
      assert(signedRead.ok, "Bukti tidak dapat dibaca melalui signed URL.");
      assert.deepEqual(Buffer.from(await signedRead.arrayBuffer()), fixture.bytes);
      console.log(
        `Lolos: ${fixture.type}, CORS, upload tanpa API key, baca server/signed URL, akses publik ditolak, overwrite ditolak.`,
      );
    }

    const forbiddenKey = `spp/${athleteId}/${month}/${randomUUID()}.svg`;
    keys.push(forbiddenKey);
    const { data: forbiddenTicket, error: forbiddenTicketError } =
      await bucket.createSignedUploadUrl(forbiddenKey);
    assert(!forbiddenTicketError && forbiddenTicket, "Gagal membuat tiket uji MIME.");
    const forbidden = await request(forbiddenTicket.signedUrl, {
      method: "PUT",
      headers: { "Content-Type": "image/svg+xml", "x-upsert": "false" },
      body: '<svg xmlns="http://www.w3.org/2000/svg"/>',
    });
    assert(!forbidden.ok, "Bucket harus menolak SVG.");
    console.log("Lolos: bucket menolak MIME SVG.");
  } finally {
    const { error } = await bucket.remove(keys);
    assert(!error, "Gagal membersihkan objek smoke test.");
    const { data: remaining, error: listError } = await bucket.list(`spp/${athleteId}/${month}`);
    assert(
      !listError && remaining?.length === 0,
      "Masih ada objek smoke test yang belum dibersihkan.",
    );
    console.log("Objek smoke test sudah dibersihkan.");
  }
}

main().catch((error: unknown) => {
  // Pesan assertion ditulis sendiri; error jaringan tidak mencetak URL bertoken.
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "Verifikasi Storage gagal; periksa koneksi dan konfigurasi Supabase.",
  );
  process.exitCode = 1;
});
