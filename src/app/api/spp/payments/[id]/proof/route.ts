import { NextResponse } from "next/server";

import { fail, isAppError } from "@/lib/errors";
import { requireActor } from "@/lib/permissions/actor";
import { enforceRateLimit } from "@/services/rate-limit-service";
import { getProofUrl } from "@/services/spp-service";

const STATUS = { NOT_FOUND: 404, FORBIDDEN: 403, UNAUTHORIZED: 401, RATE_LIMITED: 429 } as const;

// Lihat bukti SPP: admin semua, pelatih atlet binaan, atlet miliknya sendiri (athleteScope),
// lalu arahkan ke signed URL Supabase (5 menit).
export async function GET(_request: Request, ctx: RouteContext<"/api/spp/payments/[id]/proof">) {
  const actor = await requireActor();
  const { id } = await ctx.params;
  try {
    await enforceRateLimit("download", actor.userId);
    const url = await getProofUrl(actor, id);
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
