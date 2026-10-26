import { NextResponse } from "next/server";

import { toRosterExport } from "@/features/exports/roster-data";
import { renderRosterPdf } from "@/features/exports/roster-pdf";
import { buildRosterWorkbook } from "@/features/exports/roster-xlsx";
import { requireAdmin } from "@/lib/auth/session";
import { fail, isAppError } from "@/lib/errors";
import { toClubDateInput } from "@/lib/format";
import { requireActor } from "@/lib/permissions/actor";
import { rosterFileName } from "@/lib/registrations";
import { exportFormatSchema } from "@/lib/validations/registrations";
import { getRoster, recordRosterExport } from "@/services/competition-registration-service";
import { enforceRateLimit } from "@/services/rate-limit-service";

const CONTENT_TYPE = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
} as const;

const NO_STORE = { "Cache-Control": "no-store" };

// Export rekap pendaftar (doc/SECURITY.md §12.1): hanya admin ber-MFA, data diambil ulang
// dari database, file dibuat on-the-fly dan tidak disimpan.
export async function GET(
  request: Request,
  ctx: RouteContext<"/api/admin/competitions/[id]/registrations/export">,
) {
  await requireAdmin();
  const actor = await requireActor("ADMIN");
  const { id } = await ctx.params;
  const format = exportFormatSchema.safeParse(new URL(request.url).searchParams.get("format"));
  if (!format.success) {
    return NextResponse.json(fail("VALIDATION_ERROR", "Format harus xlsx atau pdf."), {
      status: 400,
      headers: NO_STORE,
    });
  }

  try {
    await enforceRateLimit("export", actor.userId);
    const now = new Date();
    const data = toRosterExport(await getRoster(actor, id), now);
    const body =
      format.data === "xlsx" ? await buildRosterWorkbook(data) : await renderRosterPdf(data);
    await recordRosterExport(actor, id, format.data);

    const fileName = rosterFileName(data.event.name, toClubDateInput(now), format.data);
    return new Response(new Uint8Array(body), {
      headers: {
        ...NO_STORE,
        "Content-Type": CONTENT_TYPE[format.data],
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": String(body.length),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (!isAppError(error)) throw error;
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "RATE_LIMITED"
            ? 429
            : 400;
    return NextResponse.json(fail(error.code, error.message), { status, headers: NO_STORE });
  }
}
