/**
 * GET /api/admin/export/[type]
 *
 * Streams a PHI-free CSV for compliance audits.
 * Types: users | bios | flags
 *
 * Requires: admin role (superadmin, admin, owner, company_admin)
 * HIPAA: No names, emails, clinical data, or encrypted fields in any export.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  exportUsers,
  exportBios,
  exportFlags,
  rowsToCsv,
} from "@/lib/supabase/analytics-service";
import { isAdminOrAbove } from "@/lib/role-permissions";

const ALLOWED_TYPES = ["users", "bios", "flags"] as const;
type ExportType = (typeof ALLOWED_TYPES)[number];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  // Auth gate
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  const access = {
    signedIn: true,
    userId: user.id,
    organizationId: profile?.organization_id,
    role: profile?.role,
  };

  if (!isAdminOrAbove(access)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { type } = await params;

  if (!ALLOWED_TYPES.includes(type as ExportType)) {
    return NextResponse.json(
      { error: `Unknown export type "${type}". Allowed: ${ALLOWED_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `predictsafe-${type}-${timestamp}.csv`;

  let csv = "";
  switch (type as ExportType) {
    case "users":
      csv = rowsToCsv(await exportUsers());
      break;
    case "bios":
      csv = rowsToCsv(await exportBios());
      break;
    case "flags":
      csv = rowsToCsv(await exportFlags());
      break;
  }

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      // Audit header — tells compliance reviewers this export was generated
      "X-Export-Type": type,
      "X-Export-Timestamp": new Date().toISOString(),
      "X-Export-Note": "PHI-free export — aggregate identifiers only",
    },
  });
}
