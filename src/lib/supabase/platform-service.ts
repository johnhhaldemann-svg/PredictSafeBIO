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

  // Parallel queries
  const [metricsResult, rlsResult, recentEventsResult, orgBreakdownResult] = await Promise.all([
    admin.rpc("get_platform_metrics").select("*").maybeSingle().catch(() => ({ data: null })),
    admin
      .from("pg_tables" as never)
      .select("tablename,rowsecurity")
      .eq("schemaname", "public")
      .catch(() => ({ data: null })),
    admin
      .from("audit_events")
      .select("event_type, summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10)
      .catch(() => ({ data: null })),
    admin
      .from("profiles")
      .select("organization_id")
      .not("organization_id", "is", null)
      .catch(() => ({ data: null }))
  ]);

  // Counts via direct SQL (fallback to simple queries)
  const counts = await getSimpleCounts(admin);

  // RLS check from pg_tables
  const rlsRows = (rlsResult?.data as { tablename: string; rowsecurity: boolean }[] | null) ?? [];
  const tablesWithRls = rlsRows.filter((r) => r.rowsecurity).length;
  const tablesWithoutRls = rlsRows.filter((r) => !r.rowsecurity).map((r) => r.tablename);

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

  const orgRows = orgBreakdownResult?.data ?? [];
  const orgCounts: Record<string, number> = {};
  for (const row of orgRows as { organization_id: string }[]) {
    orgCounts[row.organization_id] = (orgCounts[row.organization_id] ?? 0) + 1;
  }
  const orgs: PlatformOrgSummary[] = Object.entries(orgCounts).map(([organizationId, memberCount]) => ({
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
// Simple count queries (fallback when RPC not available)
// ---------------------------------------------------------------------------

async function getSimpleCounts(admin: ReturnType<typeof getSupabaseAdminClient>) {
  const countOf = async (table: string): Promise<number> => {
    const { count } = await admin.from(table as never).select("id", { count: "exact", head: true }).catch(() => ({ count: 0 }));
    return count ?? 0;
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
  const { data: profileData } = await admin
    .from("profiles" as never)
    .select("organization_id")
    .not("organization_id", "is", null)
    .catch(() => ({ data: [] }));

  const profiles = (profileData ?? []) as { organization_id: string }[];
  const onboardedUsers = profiles.length;
  const totalOrgs = new Set(profiles.map((p) => p.organization_id)).size;

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
    totalInspections
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
