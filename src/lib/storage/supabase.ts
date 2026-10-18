import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { AppError } from "@/lib/errors";

import { PRIVATE_BUCKET } from "./pdf";

// Supabase Storage hanya diakses dari server dengan service role key (melewati RLS).
// Key ini tidak boleh memakai prefix NEXT_PUBLIC_ dan tidak pernah dikirim ke browser.

let client: SupabaseClient | null = null;

export function isStorageConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new AppError("INTERNAL_ERROR", "Penyimpanan file belum dikonfigurasi.");
  }
  client ??= createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

// Bucket privat untuk dokumen (PDF event). Akses file selalu lewat signed URL berumur pendek.
export function privateDocs() {
  return getClient().storage.from(PRIVATE_BUCKET);
}
