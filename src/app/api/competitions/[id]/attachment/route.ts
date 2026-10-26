import { NextResponse } from "next/server";

import { fail, isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { getAttachmentDownloadUrl } from "@/services/competition-service";
import { enforceRateLimit } from "@/services/rate-limit-service";

const STATUS = { NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401, RATE_LIMITED: 429 } as const;

// Unduh PDF event: cek izin lihat event, lalu arahkan ke signed URL Supabase (5 menit).
// Semua role yang login boleh memanggil; event DRAFT hanya untuk pengelolanya.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/competitions/[id]/attachment">,
) {
  const actor = await requireActor();
  const { id } = await ctx.params;
  try {
    await enforceRateLimit("download", actor.userId);
    const url = await getAttachmentDownloadUrl(actor, id);
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (!isAppError(error)) throw error;
    const status = error.code in STATUS ? STATUS[error.code as keyof typeof STATUS] : 500;
    return NextResponse.json(fail(error.code, error.message), {
      status,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
