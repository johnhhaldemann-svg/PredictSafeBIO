import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return "(no records)\n";
  const headers = Object.keys(rows[0]);
  const escape = (v: any): string => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  const { orgId } = await params;

  // Auth check — superadmin only
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "superadmin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const typesParam = req.nextUrl.searchParams.get("types") ?? "assessments,documents,capas";
  const types = typesParam.split(",").map((t) => t.trim()).filter(Boolean);

  const admin = getSupabaseAdminClient();

  const { data: org } = await admin.from("organizations").select("name").eq("id", orgId).single();
  if (!org) return NextResponse.json({ error: "Org not found" }, { status: 404 });

  const sections: string[] = [`# Export: ${org.name}`, `# Generated: ${new Date().toISOString()}`, ""];

  if (types.includes("assessments")) {
    const { data } = await admin
      .from("biosafety_risk_assessments")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    sections.push("# ASSESSMENTS");
    sections.push(toCSV(data ?? []));
  }

  if (types.includes("documents")) {
    const { data } = await admin
      .from("document_metadata")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    sections.push("# DOCUMENTS");
    sections.push(toCSV(data ?? []));
  }

  if (types.includes("capas")) {
    const { data } = await admin
      .from("capa_records")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    sections.push("# CAPAS");
    sections.push(toCSV(data ?? []));
  }

  // Record the export in the audit log
  await admin.from("audit_events").insert({
    organization_id: orgId,
    actor_id: user.id,
    event_type: "superadmin_data_exported",
    summary: `Data exported: ${types.join(", ")}`,
    payload: { types },
  });

  const slug = org.name.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const date = new Date().toISOString().split("T")[0];
  const filename = `${slug}_export_${date}.csv`;

  return new NextResponse(sections.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
