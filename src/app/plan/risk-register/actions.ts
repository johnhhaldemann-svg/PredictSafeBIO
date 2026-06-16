"use server";

import { redirect } from "next/navigation";
import {
  createRiskRegisterEntry,
  updateRiskRegisterStatus,
  type ControlType,
  type RiskStatus,
  type RegulationFramework,
  type ComplianceGap,
} from "@/lib/supabase/risk-register-service";
import type { ControlEffectivenessTier } from "@/lib/risk/scoring";
import { authMessage, authSuccess } from "@/lib/auth-routing";

const PATH = "/plan/risk-register";

export async function createRiskRegisterEntryAction(formData: FormData) {
  const regulation = String(formData.get("regulation") ?? "").trim() as RegulationFramework;
  const requirementDetail = String(formData.get("requirementDetail") ?? "").trim();
  const activity = String(formData.get("activity") ?? "").trim();
  const complianceGap = String(formData.get("complianceGap") ?? "").trim() as ComplianceGap;

  if (!regulation) redirect(authMessage(PATH, "Regulation is required."));
  if (!activity && !requirementDetail) redirect(authMessage(PATH, "Activity or requirement detail is required."));
  if (!complianceGap) redirect(authMessage(PATH, "Compliance gap is required."));

  const result = await createRiskRegisterEntry({
    regulation,
    requirementDetail,
    activity,
    complianceGap,
    controlTier: (String(formData.get("controlTier") ?? "").trim() || "none") as ControlEffectivenessTier,
    area: String(formData.get("area") ?? "").trim() || undefined,
    process: String(formData.get("process") ?? "").trim() || undefined,
    sourceBasis: String(formData.get("sourceBasis") ?? "").trim() || undefined,
    controlType: (String(formData.get("controlType") ?? "").trim() || undefined) as ControlType | undefined,
    controlDescription: String(formData.get("controlDescription") ?? "").trim() || undefined,
    frequency: String(formData.get("frequency") ?? "").trim() || undefined,
    programName: String(formData.get("programName") ?? "").trim() || undefined,
  });
  redirect(result.ok ? authSuccess(PATH, result.message) : authMessage(PATH, result.message));
}

export async function updateRiskRegisterStatusAction(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as RiskStatus;
  if (!id || !status) redirect(PATH);
  const result = await updateRiskRegisterStatus(id, status);
  redirect(result.ok ? authSuccess(PATH, result.message) : authMessage(PATH, result.message));
}
