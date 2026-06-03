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
  period: string;
  total: number;
  by_role: Record<string, number>;
};

export type SignupGrowth = {
  daily: SignupDataPoint[];
  weekly: SignupDataPoint[];
  monthly: SignupDataPoint[];
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
  approval_rate_pct: number;
  avg_review_hours: number | null;
  npi_verified_count: number;
  flags: {
    total: number;
    pending: number;
    actioned: number;
    dismissed: number;
    by_reason: Record<string, number>;
  };
};

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

  const buildFallback = async (truncUnit: string, days: number): Promise<SignupDataPoint[]> => {
    const { data: rows } = await admin
      .from("profiles")
      .select("role, created_at")
      .gte("created_at", new Date(Date.now() - days * 86400000).toISOString())
      .order("created_at");

    if (!rows) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const typedRows = rows as any[];
    const map = new Map<string, Record<string, number>>();
    for (const r of typedRows) {
      const key = new Date(r.created_at as string)
        .toISOString()
        .slice(0, truncUnit === "day" ? 10 : 7);
      if (!map.has(key)) map.set(key, {});
      const bucket = map.get(key)!;
      const role = r.role as string;
      bucket[role] = (bucket[role] ?? 0) + 1;
      bucket._total = (bucket._total ?? 0) + 1;
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, counts]) => ({
        period,
        total: counts._total ?? 0,
        by_role: Object.fromEntries(
          Object.entries(counts).filter(([k]) => k !== "_total")
        ),
      }));
  };

  const daily   = await buildFallback("day",   30);
  const weekly  = await buildFallback("week",  84);
  const monthly = await buildFallback("month", 365);

  const { data: allUsersRaw } = await admin
    .from("profiles")
    .select("role, created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allUsers = (allUsersRaw ?? []) as any[];
  const now = Date.now();

  const totals = {
    all_time: allUsers.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_7d:  allUsers.filter((u: any) => new Date(u.created_at as string).getTime() > now - 7  * 86400000).length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_30d: allUsers.filter((u: any) => new Date(u.created_at as string).getTime() > now - 30 * 86400000).length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    last_90d: allUsers.filter((u: any) => new Date(u.created_at as string).getTime() > now - 90 * 86400000).length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    by_role: allUsers.reduce<Record<string, number>>((acc, u: any) => {
      const role = u.role as string;
      acc[role] = (acc[role] ?? 0) + 1;
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

  const countMap = new Map<string, { count: number; last: string }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const v of viewData as any[]) {
    const existing = countMap.get(v.profile_id as string);
    if (!existing) {
      countMap.set(v.profile_id as string, { count: 1, last: v.viewed_at as string });
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
    .select("id, specialty, npi_number, organizations ( name ), profiles!provider_profiles_user_id_fkey ( full_name )")
    .in("id", topIds);

  return topIds.map((id) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = ((profiles ?? []) as any[]).find((x: any) => x.id === id) as any;
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
  const [{ data: profilesRaw }, { data: reportsRaw }] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("provider_profiles")
      .select("review_status, npi_verified, submitted_at, reviewed_at")
      .eq("is_active", true),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from("bio_reports")
      .select("status, reason, created_at, reviewed_at"),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pp = (profilesRaw ?? []) as any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rr = (reportsRaw ?? []) as any[];

  const total_approved          = pp.filter((p: any) => p.review_status === "approved").length;
  const total_rejected          = pp.filter((p: any) => p.review_status === "rejected").length;
  const total_changes_requested = pp.filter((p: any) => p.review_status === "changes_requested").length;
  const total_taken_down        = pp.filter((p: any) => p.review_status === "taken_down").length;
  const total_pending           = pp.filter((p: any) => p.review_status === "pending").length;
  const total_submitted         = pp.length;
  const decided = total_approved + total_rejected;
  const approval_rate_pct = decided > 0 ? Math.round((total_approved / decided) * 100) : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const reviewTimes = pp
    .filter((p: any) => p.submitted_at && p.reviewed_at)
    .map((p: any) =>
      (new Date(p.reviewed_at as string).getTime() - new Date(p.submitted_at as string).getTime()) / 3600000
    );
  const avg_review_hours = reviewTimes.length > 0
    ? Math.round(reviewTimes.reduce((a: number, b: number) => a + b, 0) / reviewTimes.length * 10) / 10
    : null;

  const by_reason = rr.reduce<Record<string, number>>((acc, r: any) => {
    const reason = r.reason as string;
    acc[reason] = (acc[reason] ?? 0) + 1;
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
    npi_verified_count: pp.filter((p: any) => p.npi_verified).length,
    flags: {
      total:     rr.length,
      pending:   rr.filter((r: any) => r.status === "pending").length,
      actioned:  rr.filter((r: any) => r.status === "actioned").length,
      dismissed: rr.filter((r: any) => r.status === "dismissed").length,
      by_reason,
    },
  };
}

// ── CSV exports (PHI-free) ────────────────────────────────────────────────────

export async function exportUsers(): Promise<UserExportRow[]> {
  const admin = getSupabaseAdminClient();
  // Excluded: full_name, email — account_status cast as any since not in generated types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("profiles")
    .select("id, role, account_status, organization_id, created_at")
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r: any) => ({
    id:               r.id as string,
    role:             r.role as string,
    account_status:   (r.account_status as string | undefined) ?? "active",
    organization_id:  (r.organization_id as string | null) ?? null,
    created_at:       r.created_at as string,
  }));
}

export async function exportBios(): Promise<BioExportRow[]> {
  const admin = getSupabaseAdminClient();
  // Excluded: license_number, npi_number, full names, encrypted_notes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("id, organization_id, specialty, credentials, review_status, is_public, npi_verified, submitted_at, reviewed_at")
    .eq("is_active", true)
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r: any) => ({
    profile_id:     r.id as string,
    organization_id: r.organization_id as string,
    specialty:      r.specialty ?? null,
    credentials:    ((r.credentials ?? []) as string[]).join("; "),
    review_status:  r.review_status as string,
    is_public:      r.is_public as boolean,
    npi_verified:   r.npi_verified as boolean,
    submitted_at:   r.submitted_at ?? null,
    reviewed_at:    r.reviewed_at ?? null,
  }));
}

export async function exportFlags(): Promise<FlagExportRow[]> {
  const admin = getSupabaseAdminClient();
  // Excluded: reporter_id, reviewer_notes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("bio_reports")
    .select("id, target_type, reason, status, created_at, reviewed_at")
    .order("created_at");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).map((r: any) => ({
    report_id:   r.id as string,
    target_type: r.target_type as string,
    reason:      r.reason as string,
    status:      r.status as string,
    created_at:  r.created_at as string,
    reviewed_at: r.reviewed_at ?? null,
  }));
}

// ── CSV serialiser ────────────────────────────────────────────────────────────

export function rowsToCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown): string => {
    const s = v === null || v === undefined ? "" : String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };
  return [
    headers.join(","),
    ...rows.map(r => headers.map(h => escape(r[h])).join(",")),
  ].join("\n");
}
