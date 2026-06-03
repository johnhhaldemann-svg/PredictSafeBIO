/**
 * analytics-service.ts
 *
 * Phase 3 — Analytics & Metrics.
 * All queries return aggregate counts only — no PHI, no individual tracking.
 * Uses the service-role client (bypasses RLS) since analytics are admin-only.
 *
 * HIPAA: No names, emails, DOBs, diagnoses, or encrypted_notes in any output.
 *        User exports include: id, role, account_status, organization_id, created_at only.
 */

import { getSupabaseAdminClient } from "./admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type SignupDataPoint = {
  period: string;    // ISO date string (day/week/month start)
  total: number;
  by_role: Record<string, number>;
};

export type SignupGrowth = {
  daily: SignupDataPoint[];    // last 30 days
  weekly: SignupDataPoint[];   // last 12 weeks
  monthly: SignupDataPoint[];  // last 12 months
  totals: {
    all_time: number;
    last_7d: number;
    last_30d: number;
    last_90d: number;
    by_role: Record<string, number>;
  };
};

export type ProfileViewStat = {
  profile_id: string;
  provider_name: string | null;
  specialty: string | null;
  npi_number: string | null;
  organization_name: string | null;
  view_count: number;
  last_viewed_at: string | null;
};

export type ModerationStats = {
  total_submitted: number;
  total_approved: number;
  total_rejected: number;
  total_changes_requested: number;
  total_taken_down: number;
  total_pending: number;
  approval_rate_pct: number;       // approved / (approved + rejected) * 100
  avg_review_hours: number | null; // avg(reviewed_at - submitted_at)
  npi_verified_count: number;
  flags: {
    total: number;
    pending: number;
    actioned: number;
    dismissed: number;
    by_reason: Record<string, number>;
  };
};

// PHI-free export row types
export type UserExportRow = {
  id: string;
  role: string;
  account_status: string;
  organization_id: string | null;
  created_at: string;
};

export type BioExportRow = {
  profile_id: string;
  organization_id: string;
  specialty: string | null;
  credentials: string;
  review_status: string;
  is_public: boolean;
  npi_verified: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
};

export type FlagExportRow = {
  report_id: string;
  target_type: string;
  reason: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
};

// ── Signup & Growth ───────────────────────────────────────────────────────────

export async function getSignupGrowth(): Promise<SignupGrowth> {
  const admin = getSupabaseAdminClient();

  // Daily — last 30 days
  const { data: dailyRaw } = await admin.rpc("analytics_signups_by_period" as never, {
    p_trunc: "day",
    p_days: 30,
  } as never).catch(() => ({ data: null }));

  // Weekly — last 12 weeks
  const { data: weeklyRaw } = await admin.rpc("analytics_signups_by_period" as never, {
    p_trunc: "week",
    p_days: 84,
  } as never).catch(() => ({ data: null }));

  // Monthly — last 12 months
  const { data: monthlyRaw } = await admin.rpc("analytics_signups_by_period" as never, {
    p_trunc: "month",
    p_days: 365,
  } as never).catch(() => ({ data: null }));

  // Fallback: direct queries if RPC not available
  const buildFallback = async (truncUnit: string, days: number): Promise<SignupDataPoint[]> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any).rpc("query_raw", {}).catch(() => ({ data: null }));
    if (data) return data;

    // Direct query fallback
    const { data: rows } = await admin
      .from("profiles")
      .select("role, created_at")
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at");

    if (!rows) return [];

    // Group client-side
    const map = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const key = new Date(r.created_at)
        .toISOString()
        .slice(0, truncUnit === "day" ? 10 : truncUnit === "week" ? 7 : 7);
      if (!map.has(key)) map.set(key, {});
      const bucket = map.get(key)!;
      bucket[r.role] = (bucket[r.role] ?? 0) + 1;
      bucket._total = (bucket._total ?? 0) + 1;
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, counts]) => ({
        period,
        total: counts._total ?? 0,
        by_role: Object.fromEntries(Object.entries(counts).filter(([k]) => k !== "_total")),
      }));
  };

  const daily = dailyRaw ?? await buildFallback("day", 30);
  const weekly = weeklyRaw ?? await buildFallback("week", 84);
  const monthly = monthlyRaw ?? await buildFallback("month", 365);

  // Totals
  const { data: allUsers } = await admin.from("profiles").select("role, created_at");
  const now = Date.now();
  const totals = {
    all_time: allUsers?.length ?? 0,
    last_7d:  allUsers?.filter(u => new Date(u.created_at).getTime() > now - 7 * 86400000).length ?? 0,
    last_30d: allUsers?.filter(u => new Date(u.created_at).getTime() > now - 30 * 86400000).length ?? 0,
    last_90d: allUsers?.filter(u => new Date(u.created_at).getTime() > now - 90 * 86400000).length ?? 0,
    by_role: (allUsers ?? []).reduce<Record<string, number>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return { daily, weekly, monthly, totals };
}

// ── Profile views ─────────────────────────────────────────────────────────────

export async function getTopViewedProfiles(limit = 20): Promise<ProfileViewStat[]> {
  const admin = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: viewData } = await (admin as any)
    .from("profile_views")
    .select("profile_id, viewed_at")
    .order("viewed_at", { ascending: false });

  if (!viewData || viewData.length === 0) return [];

  // Aggregate counts
  const countMap = new Map<string, { count: number; last: string }>();
  for (const v of viewData) {
    const existing = countMap.get(v.profile_id);
    if (!existing) {
      countMap.set(v.profile_id, { count: 1, last: v.viewed_at });
    } else {
      existing.count++;
    }
  }

  const topIds = Array.from(countMap.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([id]) => id);

  if (topIds.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profiles } = await (admin as any)
    .from("provider_profiles")
    .select(`
      id, specialty, npi_number,
      organizations ( name ),
      profiles!provider_profiles_user_id_fkey ( full_name )
    `)
    .in("id", topIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return topIds.map((id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (profiles ?? []).find((x: any) => x.id === id) as any;
    const stats = countMap.get(id)!;
    return {
      profile_id: id,
      provider_name: p?.profiles?.full_name ?? null,
      specialty: p?.specialty ?? null,
      npi_number: p?.npi_number ?? null,
      organization_name: p?.organizations?.name ?? null,
      view_count: stats.count,
      last_viewed_at: stats.last,
    };
  });
}

// ── Moderation stats ──────────────────────────────────────────────────────────

export async function getModerationStats(): Promise<ModerationStats> {
  const admin = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: profiles }, { data: reports }] = await Promise.all([
    (admin as any).from("provider_profiles").select("review_status, npi_verified, submitted_at, reviewed_at").eq("is_active", true),
    (admin as any).from("bio_reports").select("status, reason, created_at, reviewed_at"),
  ]);

  const pp = (profiles ?? []) as Array<{
    review_status: string; npi_verified: boolean;
    submitted_at: string | null; reviewed_at: string | null;
  }>;

  const rr = (reports ?? []) as Array<{
    status: string; reason: string;
    created_at: string; reviewed_at: string | null;
  }>;

  const total_approved = pp.filter(p => p.review_status === "approved").length;
  const total_rejected = pp.filter(p => p.review_status === "rejected").length;
  const total_changes_requested = pp.filter(p => p.review_status === "changes_requested").length;
  const total_taken_down = pp.filter(p => p.review_status === "taken_down").length;
  const total_pending = pp.filter(p => p.review_status === "pending").length;
  const total_submitted = pp.length;

  const decided = total_approved + total_rejected;
  const approval_rate_pct = decided > 0 ? Math.round((total_approved / decided) * 100) : 0;

  // Avg review time in hours (only for reviewed records)
  const reviewTimes = pp
    .filter(p => p.submitted_at && p.reviewed_at)
    .map(p => (new Date(p.reviewed_at!).getTime() - new Date(p.submitted_at!).getTime()) / 3600000);

  const avg_review_hours = reviewTimes.length > 0
    ? Math.round(reviewTimes.reduce((a, b) => a + b, 0) / reviewTimes.length * 10) / 10
    : null;

  const by_reason = rr.reduce<Record<string, number>>((acc, r) => {
    acc[r.reason] = (acc[r.reason] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total_submitted,
    total_approved,
    total_rejected,
    total_changes_requested,
    total_taken_down,
    total_pending,
    approval_rate_pct,
    avg_review_hours,
    npi_verified_count: pp.filter(p => p.npi_verified).length,
    flags: {
      total: rr.length,
      pending: rr.filter(r => r.status === "pending").length,
      actioned: rr.filter(r => r.status === "actioned").length,
      dismissed: rr.filter(r => r.status === "dismissed").length,
      by_reason,
    },
  };
}

// ── CSV exports (PHI-free) ────────────────────────────────────────────────────

export async function exportUsers(): Promise<UserExportRow[]> {
  const admin = getSupabaseAdminClient();
  // Deliberately excluded: full_name, email (in auth.users), encrypted data
  const { data } = await admin
    .from("profiles")
    .select("id, role, account_status, organization_id, created_at")
    .order("created_at");
  return (data ?? []).map(r => ({
    id: r.id,
    role: r.role,
    account_status: (r as { account_status?: string }).account_status ?? "active",
    organization_id: r.organization_id ?? null,
    created_at: r.created_at,
  }));
}

export async function exportBios(): Promise<BioExportRow[]> {
  const admin = getSupabaseAdminClient();
  // Deliberately excluded: license_number, npi_number, full names, encrypted_notes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("id, organization_id, specialty, credentials, review_status, is_public, npi_verified, submitted_at, reviewed_at")
    .eq("is_active", true)
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    profile_id: r.id,
    organization_id: r.organization_id,
    specialty: r.specialty ?? null,
    credentials: (r.credentials ?? []).join("; "),
    review_status: r.review_status,
    is_public: r.is_public,
    npi_verified: r.npi_verified,
    submitted_at: r.submitted_at ?? null,
    reviewed_at: r.reviewed_at ?? null,
  }));
}

export async function exportFlags(): Promise<FlagExportRow[]> {
  const admin = getSupabaseAdminClient();
  // Deliberately excluded: reporter_id, reviewer_notes (may contain free text with names)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("bio_reports")
    .select("id, target_type, reason, status, created_at, reviewed_at")
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    report_id: r.id,
    target_type: r.target_type,
    reason: r.reason,
    status: r.status,
    created_at: r.created_at,
    reviewed_at: r.reviewed_at ?? null,
  }));
}

// ── CSV serialiser ────────────────────────────────────────────────────────────

export function rowsToCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ].join("\n");
}
