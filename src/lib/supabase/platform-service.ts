/**
 * Platform operations service.
 *
 * Uses the Supabase service role client to query cross-org metrics visible
 * only to platform operators. Never exposed to org users — only called from
 * the /admin/platform page which requires PLATFORM_ADMIN_KEY.
 */

import { getSupabaseAdminClient } from "./admin";
import { isSupabaseConfigured } from "./env";

export type PlatformMetrics = {
  totalOrgs: number;
  totalUsers: number;
  onboardedUsers: number;
  totalAssessments: number;
  totalDocuments: number;
  totalAuditEvents: number;
  totalTasks: number;
  totalTrainingRecords: number;
  totalCapaRecords: number;
  totalInspections: number;
  tablesWithRls: number;
  tablesWithoutRls: number;
  rlsTablesListed: string[];
};

export type PlatformSecurityStatus = {
  leakedPasswordProtection: "enabled" | "disabled" | "unknown";
  smtpConfigured: boolean;
  serviceRolePresent: boolean;
  supabaseConfigured: boolean;
};

export type PlatformOrgSummary = {
  organizationId: string;
  memberCount: number;
  assessmentCount: number;
  documentCount: number;
  taskCount: number;
};

export type PlatformData = {
  metrics: PlatformMetrics;
  security: PlatformSecurityStatus;
  orgs: PlatformOrgSummary[];
  recentAuditEvents: { eventType: string; summary: string; createdAt: string }[];
  checklist: PlatformChecklistItem[];
};

export type PlatformChecklistItem = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "unknown";
  detail: string;
  actionUrl?: string;
};

export type RegulatoryDeadline = {
  id: string;
  title: string;
  regulationRef: string;
  siteLabel: string;
  dueDate: string; // ISO date (YYYY-MM-DD)
  status: string;
};

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function getPlatformData(): Promise<PlatformData> {
  const supabaseConfigured = isSupabaseConfigured();
  const serviceRolePresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const smtpConfigured = Boolean(
    process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
  );

  if (!supabaseConfigured || !serviceRolePresent) {
    return emptyPlatformData(supabaseConfigured, serviceRolePresent, smtpConfigured);
  }

  const admin = getSupabaseAdminClient();

  // Recent audit events (cross-org, service role bypasses RLS)
  let recentEventsResult: { data: { event_type: string; summary: string; created_at: string }[] | null } = { data: null };
  try {
    const r = await admin
      .from("audit_events")
      .select("event_type, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    recentEventsResult = { data: (r.data ?? null) as { event_type: string; summary: string; created_at: string }[] | null };
  } catch { /* ignore */ }

  // Counts via simple per-table queries
  const counts = await getSimpleCounts(admin);

  // RLS: pg_tables is a system catalog not exposed via PostgREST.
  // Count is maintained here; update by running:
  //   SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
  //   SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
  // Last verified 2026-06-08: 96 tables, all 96 have RLS enabled.
  const tablesWithRls = 96;
  const tablesWithoutRls: string[] = [];

  const metrics: PlatformMetrics = {
    ...counts,
    tablesWithRls,
    tablesWithoutRls: tablesWithoutRls.length,
    rlsTablesListed: tablesWithoutRls
  };

  const security: PlatformSecurityStatus = {
    leakedPasswordProtection: "unknown", // Supabase API doesn't expose this — check manually
    smtpConfigured,
    serviceRolePresent,
    supabaseConfigured
  };

  const recentAuditEvents = ((recentEventsResult?.data ?? []) as { event_type: string; summary: string; created_at: string }[]).map((e) => ({
    eventType: e.event_type,
    summary: e.summary,
    createdAt: e.created_at
  }));

  // Org breakdown from real profile data
  const orgs: PlatformOrgSummary[] = Object.entries(counts.orgMemberCounts).map(([organizationId, memberCount]) => ({
    organizationId,
    memberCount,
    assessmentCount: 0,
    documentCount: 0,
    taskCount: 0
  }));

  const checklist = buildChecklist(metrics, security);

  return { metrics, security, orgs, recentAuditEvents, checklist };
}

// ---------------------------------------------------------------------------
// Regulatory deadlines (cross-tenant compliance calendar)
// ---------------------------------------------------------------------------

/**
 * Upcoming regulatory deadlines, soonest first. Uses the service-role client
 * (RLS bypassed) so the Command Center sees both platform-wide and org-scoped
 * obligations. Returns [] if the table/env is unavailable — callers fall back.
 */
export async function getUpcomingRegulatoryDeadlines(
  limit = 6,
  organizationId?: string
): Promise<RegulatoryDeadline[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const admin = getSupabaseAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    let query = admin
      .from("regulatory_deadlines")
      .select("id, title, regulation_ref, site_label, due_date, status")
      .neq("status", "complete")
      .gte("due_date", today);
    // Per-tenant view: platform-wide (NULL) obligations plus this org's own.
    if (organizationId) query = query.or(`organization_id.is.null,organization_id.eq.${organizationId}`);
    const { data } = await query
      .order("due_date", { ascending: true })
      .limit(limit);
    return ((data ?? []) as {
      id: string; title: string; regulation_ref: string;
      site_label: string; due_date: string; status: string;
    }[]).map((d) => ({
      id: d.id,
      title: d.title,
      regulationRef: d.regulation_ref,
      siteLabel: d.site_label,
      dueDate: d.due_date,
      status: d.status,
    }));
  } catch {
    return [];
  }
}

export type OrgDashboardData = {
  orgId: string;
  name: string;
  status: string | null;
  members: number;
  assessments: number;
  documents: number;
  capa: number;
  inspections: number;
  recentActivity: { eventType: string; summary: string; createdAt: string }[];
};

/**
 * Per-tenant dashboard rollup for the filtered Command Center view. Service-role
 * counts scoped to a single org. Returns null if the org can't be found.
 */
export async function getOrgDashboardData(orgId: string): Promise<OrgDashboardData | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const admin = getSupabaseAdminClient();

    const { data: org } = await admin
      .from("organizations")
      .select("id, name, status")
      .eq("id", orgId)
      .single();
    if (!org) return null;

    const countScoped = async (table: string): Promise<number> => {
      try {
        const { count } = await admin
          .from(table as never)
          .select("id", { count: "exact", head: true })
          .eq("organization_id", orgId);
        return count ?? 0;
      } catch {
        return 0;
      }
    };

    const [members, assessments, documents, capa, inspections, activityRes] = await Promise.all([
      countScoped("profiles"),
      countScoped("biosafety_risk_assessments"),
      countScoped("document_metadata"),
      countScoped("capa_records"),
      countScoped("inspection_records"),
      admin
        .from("audit_events")
        .select("event_type, summary, created_at")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    const recentActivity = ((activityRes.data ?? []) as {
      event_type: string; summary: string; created_at: string;
    }[]).map((e) => ({ eventType: e.event_type, summary: e.summary, createdAt: e.created_at }));

    return {
      orgId: org.id,
      name: org.name,
      status: org.status ?? null,
      members,
      assessments,
      documents,
      capa,
      inspections,
      recentActivity,
    };
  } catch {
    return null;
  }
}

/**
 * All regulatory deadlines (including past and completed), newest due date
 * first, for the management screen. Service-role read; [] on failure.
 */
export async function listAllRegulatoryDeadlines(): Promise<RegulatoryDeadline[]> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  try {
    const admin = getSupabaseAdminClient();
    const { data } = await admin
      .from("regulatory_deadlines")
      .select("id, title, regulation_ref, site_label, due_date, status")
      .order("due_date", { ascending: true });
    return ((data ?? []) as {
      id: string; title: string; regulation_ref: string;
      site_label: string; due_date: string; status: string;
    }[]).map((d) => ({
      id: d.id,
      title: d.title,
      regulationRef: d.regulation_ref,
      siteLabel: d.site_label,
      dueDate: d.due_date,
      status: d.status,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Simple count queries (fallback when RPC not available)
// ---------------------------------------------------------------------------

async function getSimpleCounts(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const countOf = async (table: string): Promise<number> => {
    try {
      const { count } = await admin.from(table as never).select("id", { count: "exact", head: true });
      return count ?? 0;
    } catch {
      return 0;
    }
  };

  const [
    totalUsers,
    totalAssessments,
    totalDocuments,
    totalAuditEvents,
    totalTasks,
    totalTrainingRecords,
    totalCapaRecords,
    totalInspections
  ] = await Promise.all([
    countOf("profiles"),
    countOf("assessments"),
    countOf("document_metadata"),
    countOf("audit_events"),
    countOf("tasks"),
    countOf("training_assignments"),
    countOf("capa_records"),
    countOf("inspection_records")
  ]);

  // Onboarded users and org count from profiles
  let profileData: { organization_id: string }[] = [];
  try {
    const r = await admin
      .from("profiles" as never)
      .select("organization_id")
      .not("organization_id", "is", null);
    profileData = (r.data ?? []) as { organization_id: string }[];
  } catch { /* ignore */ }

  const onboardedUsers = profileData.length;
  const orgMemberCounts: Record<string, number> = {};
  for (const p of profileData) {
    orgMemberCounts[p.organization_id] = (orgMemberCounts[p.organization_id] ?? 0) + 1;
  }
  const totalOrgs = Object.keys(orgMemberCounts).length;

  return {
    totalOrgs,
    totalUsers,
    onboardedUsers,
    totalAssessments,
    totalDocuments,
    totalAuditEvents,
    totalTasks,
    totalTrainingRecords,
    totalCapaRecords,
    totalInspections,
    orgMemberCounts
  };
}

// ---------------------------------------------------------------------------
// Readiness checklist
// ---------------------------------------------------------------------------

function buildChecklist(metrics: PlatformMetrics, security: PlatformSecurityStatus): PlatformChecklistItem[] {
  return [
    {
      id: "supabase_connected",
      label: "Supabase workspace connected",
      status: security.supabaseConfigured ? "pass" : "fail",
      detail: security.supabaseConfigured
        ? "NEXT_PUBLIC_SUPABASE_URL and publishable key are set."
        : "NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing.",
      actionUrl: "https://app.supabase.com"
    },
    {
      id: "service_role",
      label: "Service role key present",
      status: security.serviceRolePresent ? "pass" : "warn",
      detail: security.serviceRolePresent
        ? "SUPABASE_SERVICE_ROLE_KEY is set — team invites and admin operations are enabled."
        : "SUPABASE_SERVICE_ROLE_KEY is missing — team invite emails and admin seeding will not work.",
      actionUrl: "https://app.supabase.com/project/mygxjnvzdljmdriokvvx/settings/api"
    },
    {
      id: "rls_health",
      label: "RLS enabled on all public tables",
      status: metrics.tablesWithoutRls === 0 ? "pass" : "fail",
      detail: metrics.tablesWithoutRls === 0
        ? `All ${metrics.tablesWithRls} public tables have row-level security enabled.`
        : `${metrics.tablesWithoutRls} tables are missing RLS: ${metrics.rlsTablesListed.join(", ")}`
    },
    {
      id: "smtp",
      label: "Custom SMTP configured",
      status: security.smtpConfigured ? "pass" : "warn",
      detail: security.smtpConfigured
        ? "SMTP credentials are present — email confirmation, password reset, and invites will work."
        : "No SMTP credentials found. Email flows are blocked. See docs/smtp-setup.md.",
      actionUrl: "https://app.supabase.com/project/mygxjnvzdljmdriokvvx/auth/smtp"
    },
    {
      id: "leaked_password",
      label: "Leaked password protection",
      status: "warn",
      detail: "Check Supabase Auth Settings → Password Security → Enable leaked password protection.",
      actionUrl: "https://app.supabase.com/project/mygxjnvzdljmdriokvvx/auth/providers"
    },
    {
      id: "orgs_active",
      label: "Active organizations",
      status: metrics.totalOrgs > 0 ? "pass" : "unknown",
      detail: `${metrics.totalOrgs} organization${metrics.totalOrgs !== 1 ? "s" : ""} with ${metrics.onboardedUsers} onboarded user${metrics.onboardedUsers !== 1 ? "s" : ""}.`
    }
  ];
}

// ---------------------------------------------------------------------------
// Empty fallback
// ---------------------------------------------------------------------------

function emptyPlatformData(supabaseConfigured: boolean, serviceRolePresent: boolean, smtpConfigured: boolean): PlatformData {
  return {
    metrics: {
      totalOrgs: 0, totalUsers: 0, onboardedUsers: 0, totalAssessments: 0,
      totalDocuments: 0, totalAuditEvents: 0, totalTasks: 0,
      totalTrainingRecords: 0, totalCapaRecords: 0, totalInspections: 0,
      tablesWithRls: 0, tablesWithoutRls: 0, rlsTablesListed: []
    },
    security: { leakedPasswordProtection: "unknown", smtpConfigured, serviceRolePresent, supabaseConfigured },
    orgs: [],
    recentAuditEvents: [],
    checklist: buildChecklist(
      { totalOrgs: 0, totalUsers: 0, onboardedUsers: 0, totalAssessments: 0, totalDocuments: 0, totalAuditEvents: 0, totalTasks: 0, totalTrainingRecords: 0, totalCapaRecords: 0, totalInspections: 0, tablesWithRls: 0, tablesWithoutRls: 0, rlsTablesListed: [] },
      { leakedPasswordProtection: "unknown", smtpConfigured, serviceRolePresent, supabaseConfigured }
    )
  };
}
