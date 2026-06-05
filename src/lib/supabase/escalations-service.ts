/**
 * Platform escalations — a cross-tenant "needs attention" inbox.
 *
 * Rather than inventing a new workflow, this aggregates REAL signals already in
 * the platform: suspended organizations, content awaiting moderation, overdue
 * corrective actions (CAPA), and failing/at-risk readiness checks. Each
 * escalation links to where it's resolved.
 *
 * Service-role reads only — surfaced on /admin/escalations, the Command Center,
 * and the per-tenant filtered view. Returns [] when Supabase isn't configured.
 */

import { getSupabaseAdminClient } from "./admin";
import { isSupabaseConfigured } from "./env";
import { getPlatformData, type PlatformChecklistItem } from "./platform-service";
import { listProviderBiosByStatus } from "./moderation-service";

export type EscalationSeverity = "critical" | "warning" | "info";

export type Escalation = {
  id: string;
  severity: EscalationSeverity;
  title: string;
  detail: string;
  source: string; // "Organization" | "Moderation" | "Safety Action" | "Readiness"
  href: string;
};

const SEVERITY_RANK: Record<EscalationSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// CAPA statuses that count as resolved (not an open obligation).
const CLOSED_CAPA_STATUSES = ["closed", "complete", "completed", "verified", "cancelled", "approved"];

type Options = {
  /** Pass an already-fetched checklist to avoid re-running getPlatformData(). */
  checklist?: PlatformChecklistItem[];
  /** Scope every signal to a single organization (per-tenant filtered view). */
  organizationId?: string;
};

export async function getPlatformEscalations(opts: Options = {}): Promise<Escalation[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];

  const { organizationId } = opts;
  const out: Escalation[] = [];
  const admin = getSupabaseAdminClient();

  // 1. Suspended organizations — member logins blocked.
  try {
    let q = admin.from("organizations").select("id, name, status").eq("status", "suspended");
    if (organizationId) q = q.eq("id", organizationId);
    const { data } = await q;
    for (const o of (data ?? []) as { id: string; name: string }[]) {
      out.push({
        id: `org-${o.id}`,
        severity: "critical",
        title: `Organization suspended: ${o.name}`,
        detail: "All member logins are blocked while this organization is suspended.",
        source: "Organization",
        href: `/admin/org/${o.id}?tab=controls`,
      });
    }
  } catch {
    /* ignore */
  }

  // 2. Content awaiting moderation.
  try {
    const pending = await listProviderBiosByStatus("pending", organizationId);
    if (pending.length > 0) {
      out.push({
        id: "mod-pending",
        severity: "warning",
        title: `${pending.length} provider bio${pending.length === 1 ? "" : "s"} awaiting review`,
        detail: "Submitted content is queued in the moderation inbox.",
        source: "Moderation",
        href: "/admin/moderation",
      });
    }
  } catch {
    /* ignore */
  }

  // 3. Overdue corrective actions (CAPA) past their due date.
  try {
    const today = new Date().toISOString().slice(0, 10);
    let q = admin
      .from("capa_records")
      .select("organization_id")
      .is("archived_at", null)
      .not("due_date", "is", null)
      .lt("due_date", today)
      .not("status", "in", `(${CLOSED_CAPA_STATUSES.join(",")})`);
    if (organizationId) q = q.eq("organization_id", organizationId);
    const { data } = await q;

    const rows = (data ?? []) as { organization_id: string }[];
    const perOrg = new Map<string, number>();
    for (const r of rows) {
      if (r.organization_id) perOrg.set(r.organization_id, (perOrg.get(r.organization_id) ?? 0) + 1);
    }

    if (perOrg.size > 0) {
      // Resolve names for the affected orgs.
      const ids = [...perOrg.keys()];
      const { data: orgRows } = await admin.from("organizations").select("id, name").in("id", ids);
      const nameById = new Map((orgRows ?? []).map((o: { id: string; name: string }) => [o.id, o.name]));
      for (const [orgId, count] of perOrg) {
        const name = nameById.get(orgId) ?? `${orgId.slice(0, 8)}…`;
        out.push({
          id: `capa-${orgId}`,
          severity: "critical",
          title: `${count} overdue corrective action${count === 1 ? "" : "s"}${organizationId ? "" : ` — ${name}`}`,
          detail: "CAPA items are past their due date and still open.",
          source: "Safety Action",
          href: `/admin/org/${orgId}`,
        });
      }
    }
  } catch {
    /* ignore */
  }

  // 4. Organization health — pending onboarding, no members, or gone quiet.
  try {
    let orgQ = admin.from("organizations").select("id, name, status, is_archived");
    if (organizationId) orgQ = orgQ.eq("id", organizationId);
    const { data: orgRows } = await orgQ;
    const allOrgs = ((orgRows ?? []) as { id: string; name: string; status: string | null; is_archived: boolean | null }[])
      .filter((o) => !o.is_archived);

    if (allOrgs.length > 0) {
      // Member counts per org.
      const { data: profs } = await admin
        .from("profiles")
        .select("organization_id")
        .not("organization_id", "is", null);
      const memberCount = new Map<string, number>();
      for (const p of (profs ?? []) as { organization_id: string }[]) {
        memberCount.set(p.organization_id, (memberCount.get(p.organization_id) ?? 0) + 1);
      }

      // Orgs with any audit activity in the last 30 days.
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: act } = await admin
        .from("audit_events")
        .select("organization_id")
        .gte("created_at", since)
        .not("organization_id", "is", null);
      const activeOrgs = new Set((act ?? []).map((a: { organization_id: string }) => a.organization_id));

      for (const o of allOrgs) {
        if (o.status === "suspended") continue; // already raised above
        if (o.status === "pending") {
          out.push({
            id: `pending-${o.id}`,
            severity: "warning",
            title: `Onboarding pending: ${o.name}`,
            detail: "Organization is marked pending — finish setup or activate it.",
            source: "Organization",
            href: `/admin/org/${o.id}`,
          });
        } else if ((memberCount.get(o.id) ?? 0) === 0) {
          out.push({
            id: `empty-${o.id}`,
            severity: "warning",
            title: `No users yet: ${o.name}`,
            detail: "Organization has no members — invite the first user.",
            source: "Organization",
            href: `/admin/org/${o.id}?tab=users`,
          });
        } else if (!activeOrgs.has(o.id)) {
          out.push({
            id: `stale-${o.id}`,
            severity: "info",
            title: `No recent activity: ${o.name}`,
            detail: "No audit activity recorded in the last 30 days.",
            source: "Organization",
            href: `/admin/org/${o.id}`,
          });
        }
      }
    }
  } catch {
    /* ignore */
  }

  // 5. Failing / at-risk platform readiness checks (platform-wide only).
  if (!organizationId) {
    try {
      const checklist = opts.checklist ?? (await getPlatformData()).checklist;
      for (const c of checklist) {
        if (c.status === "fail") {
          out.push({
            id: `chk-${c.id}`,
            severity: "critical",
            title: c.label,
            detail: c.detail,
            source: "Readiness",
            href: "/admin/superadmin",
          });
        } else if (c.status === "warn") {
          out.push({
            id: `chk-${c.id}`,
            severity: "warning",
            title: c.label,
            detail: c.detail,
            source: "Readiness",
            href: "/admin/superadmin",
          });
        }
      }
    } catch {
      /* ignore */
    }
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);
}
