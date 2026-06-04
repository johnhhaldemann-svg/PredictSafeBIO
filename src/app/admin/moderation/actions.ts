"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import {
  approveProviderBio,
  requestBioChanges,
  rejectProviderBio,
  takedownProviderBio,
  restoreProviderBio,
  updateNpiChecklist,
  triageReport,
  type NpiChecklistKey,
  type ReportStatus,
} from "@/lib/supabase/moderation-service";
import { canViewPlatform } from "@/lib/role-permissions";

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireModerationActor() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

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

  if (!canViewPlatform(access)) redirect("/");

  return { actorId: user.id, organizationId: profile?.organization_id as string };
}

function profilePath(profileId: string) {
  return `/admin/moderation/${profileId}`;
}

// ── Bio approval workflow ─────────────────────────────────────────────────────

export async function approveProfileAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const profileId = String(formData.get("profileId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const { error } = await approveProviderBio(actorId, profileId, organizationId, notes);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath("/admin/moderation");
  revalidatePath(profilePath(profileId));
  redirect(`${profilePath(profileId)}?success=Bio+approved+and+live`);
}

export async function requestChangesAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const profileId = String(formData.get("profileId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!notes) redirect(`${profilePath(profileId)}?error=Notes+required+when+requesting+changes`);

  const { error } = await requestBioChanges(actorId, profileId, organizationId, notes);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath("/admin/moderation");
  revalidatePath(profilePath(profileId));
  redirect(`${profilePath(profileId)}?success=Changes+requested+-+provider+notified`);
}

export async function rejectProfileAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const profileId = String(formData.get("profileId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!notes) redirect(`${profilePath(profileId)}?error=Notes+required+when+rejecting`);

  const { error } = await rejectProviderBio(actorId, profileId, organizationId, notes);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath("/admin/moderation");
  revalidatePath(profilePath(profileId));
  redirect(`${profilePath(profileId)}?success=Bio+rejected`);
}

export async function takedownProfileAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const profileId = String(formData.get("profileId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!notes) redirect(`${profilePath(profileId)}?error=Notes+required+for+takedown`);

  const { error } = await takedownProviderBio(actorId, profileId, organizationId, notes);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath("/admin/moderation");
  revalidatePath(profilePath(profileId));
  redirect(`${profilePath(profileId)}?success=Bio+taken+down+(data+preserved)`);
}

export async function restoreProfileAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const profileId = String(formData.get("profileId") ?? "");

  const { error } = await restoreProviderBio(actorId, profileId, organizationId);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath("/admin/moderation");
  revalidatePath(profilePath(profileId));
  redirect(`${profilePath(profileId)}?success=Bio+restored+to+public+view`);
}

// ── NPI checklist ─────────────────────────────────────────────────────────────

export async function updateNpiChecklistAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const profileId = String(formData.get("profileId") ?? "");
  const key = String(formData.get("key") ?? "") as NpiChecklistKey;
  const checked = formData.get("checked") === "true";
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const { error } = await updateNpiChecklist(actorId, profileId, organizationId, key, checked, notes);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath(profilePath(profileId));
  redirect(profilePath(profileId));
}

// ── Report triage ─────────────────────────────────────────────────────────────

export async function triageReportAction(formData: FormData) {
  const { actorId, organizationId } = await requireModerationActor();
  const reportId = String(formData.get("reportId") ?? "");
  const profileId = String(formData.get("profileId") ?? "");
  const newStatus = String(formData.get("status") ?? "") as Exclude<ReportStatus, "pending">;
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  const { error } = await triageReport(actorId, reportId, organizationId, newStatus, notes);
  if (error) redirect(`${profilePath(profileId)}?error=${encodeURIComponent(error)}`);

  revalidatePath(profilePath(profileId));
  revalidatePath("/admin/moderation");
  redirect(`${profilePath(profileId)}?success=Report+${newStatus}`);
}
