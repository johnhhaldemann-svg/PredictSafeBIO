/**
 * AI Compliance Assistant — client-side service.
 * Invokes the ai-compliance-assistant Supabase Edge Function.
 */
import { createClient } from "@/lib/supabase/client";

export type ContextType =
  | "capa"
  | "inspection"
  | "chemical"
  | "waste"
  | "biosafety"
  | "permit"
  | "pesticide"
  | "ergonomics"
  | "general";

export const contextTypeLabels: Record<ContextType, string> = {
  capa: "CAPA / Corrective Action",
  inspection: "Inspection & Audit",
  chemical: "Chemical & SDS",
  waste: "Waste Management",
  biosafety: "Biosafety / BSL",
  permit: "Work Permit",
  pesticide: "Pesticide & Disinfectant",
  ergonomics: "Ergonomics",
  general: "General EHS"
};

export async function askComplianceAssistant(
  question: string,
  orgId: string,
  contextType: ContextType = "general"
): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.functions.invoke("ai-compliance-assistant", {
    body: { question, org_id: orgId, context_type: contextType }
  });

  if (error) throw new Error(error.message ?? "AI assistant request failed.");
  return data.answer as string;
}
