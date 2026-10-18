// Membuat / menyelaraskan bucket Supabase Storage. Aman dijalankan berulang kali.
//
//   pnpm storage:setup
//
// Butuh SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local.

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import {
  PDF_MAX_BYTES,
  PDF_MIME_TYPE,
  PRIVATE_BUCKET,
  PUBLIC_BUCKET,
} from "../src/lib/storage/pdf";

config({ path: [".env.local", ".env"], quiet: true });

type BucketSpec = {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
};

const BUCKETS: BucketSpec[] = [
  // PDF event (technical handbook). Privat: hanya lewat signed URL.
  {
    id: PRIVATE_BUCKET,
    public: false,
    fileSizeLimit: PDF_MAX_BYTES,
    allowedMimeTypes: [PDF_MIME_TYPE],
  },
  // Foto publik (website, galeri) untuk fase berikutnya.
  {
    id: PUBLIC_BUCKET,
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local terlebih dahulu.");
    process.exitCode = 1;
    return;
  }

  const storage = createClient(url, key, { auth: { persistSession: false } }).storage;

  for (const spec of BUCKETS) {
    const options = {
      public: spec.public,
      fileSizeLimit: spec.fileSizeLimit,
      allowedMimeTypes: spec.allowedMimeTypes,
    };
    const existing = await storage.getBucket(spec.id);
    const { error } = existing.data
      ? await storage.updateBucket(spec.id, options)
      : await storage.createBucket(spec.id, options);
    if (error) throw new Error(`Bucket ${spec.id}: ${error.message}`);
    console.log(
      `${existing.data ? "Diperbarui" : "Dibuat"}: ${spec.id} (${spec.public ? "publik" : "privat"})`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
