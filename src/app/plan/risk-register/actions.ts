"use server";

import { redirect } from "next/navigation";
import {
  createRiskRegisterEntry,
  updateRiskRegisterStatus,
  type ControlType,
  type RiskLevel,
  type RiskStatus,
} from "@/lib/supabase/risk-register-service";
import { authMessage, authSuccess } from "@/lib/auth-routing";

const PATH = "/plan/risk-register";

export async function createRiskRegisterEntryAction(formData: FormData) {
  const riskItem = String(formData.get("riskItem") ?? "").trim();
  if (!riskItem) redirect(authMessage(PATH, "Risk item is required."));
  const result = await createRiskRegisterEntry({
    riskItem,
    area: String(formData.get("area") ?? "").trim() || undefined,
    process: String(formData.get("process") ?? "").trim() || undefined,
    sourceBasis: String(formData.get("sourceBasis") ?? "").trim() || undefined,
    controlType: (String(formData.get("controlType") ?? "").trim() || undefined) as ControlType | undefined,
    controlDescription: String(formData.get("controlDescription") ?? "").trim() || undefined,
    frequency: String(formData.get("frequency") ?? "").trim() || undefined,
    inherentRisk: (String(formData.get("inherentRisk") ?? "").trim() || undefined) as RiskLevel | undefined,
    residualRisk: (String(formData.get("residualRisk") ?? "").trim() || undefined) as RiskLevel | undefined,
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
