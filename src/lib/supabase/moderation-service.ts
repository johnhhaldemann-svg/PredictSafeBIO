/**
 * moderation-service.ts
 *
 * Server-side queries and mutations for Phase 2 content moderation.
 * All write operations use the service-role client (bypasses RLS).
 * Callers MUST gate behind isAdminOrAbove before invoking mutations.
 *
 * HIPAA: Only non-PHI fields are surfaced in the review queue.
 *        All mutations emit audit_events rows.
 */

import { getSupabaseAdminClient } from "./admin";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ReviewStatus =
  | "pending"
  | "approved"
  | "changes_requested"
  | "rejected"
  | "taken_down";

export type ReportReason =
  | "inaccurate_credentials"
  | "inappropriate_content"
  | "suspected_fraud"
  | "privacy_concern"
  | "outdated_information"
  | "other";

export type ReportStatus = "pending" | "reviewed" | "actioned" | "dismissed";

export type NpiChecklistKey =
  | "format_valid"
  | "nppes_match"
  | "license_provided"
  | "license_state_valid"
  | "credentials_match"
  | "specialty_match"
  | "no_disciplinary";

export const NPI_CHECKLIST_LABELS: Record<NpiChecklistKey, string> = {
  format_valid:        "NPI number is 10 digits (valid format)",
  nppes_match:         "NPI found in NPPES registry — name and org match",
  license_provided:    "License number provided",
  license_state_valid: "License state is valid and active",
  credentials_match:   "Credentials match NPI record",
  specialty_match:     "Specialty matches NPI registry taxonomy",
  no_disciplinary:     "No disciplinary actions found (state board check)",
};

export type NpiChecklistItem = { checked: boolean; checked_at: string | null };
export type NpiChecklist = Record<NpiChecklistKey, NpiChecklistItem>;

export type PendingBioRow = {
  id: string;
  user_id: string;
  organization_id: string;
  organization_name: string | null;
  provider_name: string | null;
  specialty: string | null;
  npi_number: string | null;
  credentials: string[];
  review_status: ReviewStatus;
  is_public: boolean;
  submitted_at: string | null;
  reviewed_at: string | null;
  npi_verified: boolean;
  report_count: number;
};

export type BioForReview = PendingBioRow & {
  license_number: string | null;
  license_state: string | null;
  accepting_patients: boolean;
  review_notes: string | null;
  npi_checklist: NpiChecklist;
  npi_verification_notes: string | null;
  recent_audit_events: Array<{
    id: string;
    event_type: string;
    summary: string;
    created_at: string;
  }>;
  open_reports: BioReportRow[];
};

export type BioReportRow = {
  id: string;
  target_type: string;
  target_id: string;
  reporter_id: string;
  reporter_name: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  reviewer_notes: string | null;
  created_at: string;
};

// ── Review queue ──────────────────────────────────────────────────────────────

export async function listProviderBiosByStatus(
  status: ReviewStatus | "all" = "pending",
  organizationId?: string
): Promise<PendingBioRow[]> {
  const admin = getSupabaseAdminClient();

   
  let query = (admin as any)
    .from("provider_profiles")
    .select(`
      id, user_id, organization_id, specialty, npi_number, credentials,
      review_status, is_public, submitted_at, reviewed_at, npi_verified,
      organizations ( name ),
      profiles!provider_profiles_user_id_fkey ( full_name )
    `)
    .eq("is_active", true)
    .order("submitted_at", { ascending: true, nullsFirst: false });

  if (status !== "all") query = query.eq("review_status", status);
  if (organizationId) query = query.eq("organization_id", organizationId);

  const { data } = await query;

  // Fetch pending report counts per profile
   
  const { data: reportCounts } = await (admin as any)
    .from("bio_reports")
    .select("target_id, status")
    .eq("target_type", "provider_profile")
    .eq("status", "pending");

  const countMap = new Map<string, number>();
  for (const r of (reportCounts ?? [])) {
    countMap.set(r.target_id, (countMap.get(r.target_id) ?? 0) + 1);
  }

   
  return ((data ?? []) as any[]).map((p: any) => ({
    id: p.id,
    user_id: p.user_id,
    organization_id: p.organization_id,
    organization_name: p.organizations?.name ?? null,
    provider_name: p.profiles?.full_name ?? null,
    specialty: p.specialty,
    npi_number: p.npi_number,
    credentials: p.credentials ?? [],
    review_status: p.review_status,
    is_public: p.is_public,
    submitted_at: p.submitted_at,
    reviewed_at: p.reviewed_at,
    npi_verified: p.npi_verified,
    report_count: countMap.get(p.id) ?? 0,
  }));
}

export async function getBioForReview(profileId: string): Promise<BioForReview | null> {
  const admin = getSupabaseAdminClient();

   
  const { data: profile } = await (admin as any)
    .from("provider_profiles")
    .select(`
      id, user_id, organization_id, specialty, npi_number, license_number,
      license_state, credentials, accepting_patients, review_status, is_public,
      submitted_at, reviewed_at, review_notes, npi_verified, npi_verification_notes,
      npi_checklist,
      organizations ( name ),
      profiles!provider_profiles_user_id_fkey ( full_name )
    `)
    .eq("id", profileId)
    .maybeSingle();

  if (!profile) return null;
   
  const p = profile as any;

  // Fetch open reports for this profile
   
  const { data: reports } = await (admin as any)
    .from("bio_reports")
    .select(`
      id, target_type, target_id, reporter_id, reason, details, status, reviewer_notes, created_at,
      profiles!bio_reports_reporter_id_fkey ( full_name )
    `)
    .eq("target_type", "provider_profile")
    .eq("target_id", profileId)
    .order("created_at", { ascending: false });

  // Fetch recent audit events for this profile
  const { data: auditEvents } = await admin
    .from("audit_events")
    .select("id, event_type, summary, created_at")
    .contains("payload", { profile_id: profileId })
    .order("created_at", { ascending: false })
    .limit(15);

  return {
    id: p.id,
    user_id: p.user_id,
    organization_id: p.organization_id,
    organization_name: p.organizations?.name ?? null,
    provider_name: p.profiles?.full_name ?? null,
    specialty: p.specialty,
    npi_number: p.npi_number,
    license_number: p.license_number,
    license_state: p.license_state,
    credentials: p.credentials ?? [],
    accepting_patients: p.accepting_patients ?? true,
    review_status: p.review_status,
    is_public: p.is_public,
    submitted_at: p.submitted_at,
    reviewed_at: p.reviewed_at,
    review_notes: p.review_notes,
    npi_verified: p.npi_verified,
    npi_verification_notes: p.npi_verification_notes,
    npi_checklist: p.npi_checklist ?? {},
    report_count: (reports ?? []).filter((r: any) => r.status === "pending").length,
    recent_audit_events: (auditEvents ?? []) as Array<{
      id: string; event_type: string; summary: string; created_at: string;
    }>,
    open_reports: ((reports ?? []) as any[]).map((r: any) => ({
      id: r.id,
      target_type: r.target_type,
      target_id: r.target_id,
      reporter_id: r.reporter_id,
      reporter_name: r.profiles?.full_name ?? null,
      reason: r.reason,
      details: r.details,
      status: r.status,
      reviewer_notes: r.reviewer_notes,
      created_at: r.created_at,
    })),
  };
}

// ── Moderation actions ────────────────────────────────────────────────────────

async function auditLog(
  organizationId: string,
  actorId: string,
  eventType: string,
  summary: string,
  payload: Record<string, unknown>
) {
  const admin = getSupabaseAdminClient();
   
  await (admin as any).from("audit_events").insert({
    organization_id: organizationId,
    actor_id: actorId,
    event_type: eventType,
    summary,
    payload,
  });
}

export async function approveProviderBio(
  actorId: string,
  profileId: string,
  organizationId: string,
  notes?: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      review_status: "approved",
      is_public: true,
      reviewed_by: actorId,
      reviewed_at: now,
      review_notes: notes ?? null,
      updated_at: now,
    })
    .eq("id", profileId);

  if (error) return { error: (error as { message: string }).message };

  await auditLog(organizationId, actorId, "bio_approved", "Provider bio approved and made public", {
    profile_id: profileId,
    notes: notes ?? null,
  });

  return { error: null };
}

export async function requestBioChanges(
  actorId: string,
  profileId: string,
  organizationId: string,
  notes: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      review_status: "changes_requested",
      is_public: false,
      reviewed_by: actorId,
      reviewed_at: now,
      review_notes: notes,
      updated_at: now,
    })
    .eq("id", profileId);

  if (error) return { error: (error as { message: string }).message };

  await auditLog(organizationId, actorId, "bio_changes_requested",
    "Changes requested on provider bio", { profile_id: profileId, notes });

  return { error: null };
}

export async function rejectProviderBio(
  actorId: string,
  profileId: string,
  organizationId: string,
  notes: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      review_status: "rejected",
      is_public: false,
      reviewed_by: actorId,
      reviewed_at: now,
      review_notes: notes,
      updated_at: now,
    })
    .eq("id", profileId);

  if (error) return { error: (error as { message: string }).message };

  await auditLog(organizationId, actorId, "bio_rejected", "Provider bio rejected", {
    profile_id: profileId, notes,
  });

  return { error: null };
}

export async function takedownProviderBio(
  actorId: string,
  profileId: string,
  organizationId: string,
  notes: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      review_status: "taken_down",
      is_public: false,           // hidden from public — data preserved (HIPAA-safe)
      reviewed_by: actorId,
      reviewed_at: now,
      review_notes: notes,
      updated_at: now,
    })
    .eq("id", profileId);

  if (error) return { error: (error as { message: string }).message };

  await auditLog(organizationId, actorId, "bio_taken_down",
    "Provider bio taken down (data preserved, reversible)", { profile_id: profileId, notes });

  return { error: null };
}

export async function restoreProviderBio(
  actorId: string,
  profileId: string,
  organizationId: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      review_status: "approved",
      is_public: true,
      reviewed_by: actorId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", profileId);

  if (error) return { error: (error as { message: string }).message };

  await auditLog(organizationId, actorId, "bio_restored",
    "Provider bio restored to public view", { profile_id: profileId });

  return { error: null };
}

// ── NPI checklist ─────────────────────────────────────────────────────────────

export async function updateNpiChecklist(
  actorId: string,
  profileId: string,
  organizationId: string,
  checklistKey: NpiChecklistKey,
  checked: boolean,
  notes?: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

  // Fetch existing checklist
   
  const { data: existing } = await (admin as any)
    .from("provider_profiles")
    .select("npi_checklist")
    .eq("id", profileId)
    .maybeSingle();

  const currentChecklist = (existing as any)?.npi_checklist ?? {};
  const updatedChecklist = {
    ...currentChecklist,
    [checklistKey]: { checked, checked_at: checked ? now : null },
  };

  // Check if all 7 items are now verified
  const allKeys: NpiChecklistKey[] = [
    "format_valid", "nppes_match", "license_provided",
    "license_state_valid", "credentials_match", "specialty_match", "no_disciplinary",
  ];
  const allVerified = allKeys.every((k) => updatedChecklist[k]?.checked === true);

   
  const { error } = await (admin as any)
    .from("provider_profiles")
    .update({
      npi_checklist: updatedChecklist,
      npi_verified: allVerified,
      npi_verified_at: allVerified ? now : null,
      npi_verified_by: allVerified ? actorId : null,
      npi_verification_notes: notes ?? null,
      updated_at: now,
    })
    .eq("id", profileId);

  if (error) return { error: (error as { message: string }).message };

  if (allVerified) {
    await auditLog(organizationId, actorId, "bio_npi_verified",
      "NPI verification checklist completed — all 7 items confirmed", { profile_id: profileId });
  }

  return { error: null };
}

// ── Reports ───────────────────────────────────────────────────────────────────

export async function listBioReports(
  organizationId: string,
  status: ReportStatus | "all" = "pending"
): Promise<BioReportRow[]> {
  const admin = getSupabaseAdminClient();

   
  let query = (admin as any)
    .from("bio_reports")
    .select(`
      id, target_type, target_id, reporter_id, reason, details, status,
      reviewer_notes, created_at,
      profiles!bio_reports_reporter_id_fkey ( full_name )
    `)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (status !== "all") query = query.eq("status", status);

  const { data } = await query;

   
  return ((data ?? []) as any[]).map((r: any) => ({
    id: r.id,
    target_type: r.target_type,
    target_id: r.target_id,
    reporter_id: r.reporter_id,
    reporter_name: r.profiles?.full_name ?? null,
    reason: r.reason,
    details: r.details,
    status: r.status,
    reviewer_notes: r.reviewer_notes,
    created_at: r.created_at,
  }));
}

export async function triageReport(
  actorId: string,
  reportId: string,
  organizationId: string,
  newStatus: Exclude<ReportStatus, "pending">,
  notes?: string
): Promise<{ error: string | null }> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();

   
  const { error } = await (admin as any)
    .from("bio_reports")
    .update({
      status: newStatus,
      reviewed_by: actorId,
      reviewed_at: now,
      reviewer_notes: notes ?? null,
    })
    .eq("id", reportId);

  if (error) return { error: (error as { message: string }).message };

  await auditLog(organizationId, actorId, `bio_report_${newStatus}`,
    `Report ${newStatus}${notes ? `: ${notes}` : ""}`, { report_id: reportId, notes });

  return { error: null };
}
