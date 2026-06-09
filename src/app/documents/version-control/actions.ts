"use server";

import { redirect } from "next/navigation";
import {
  logDocumentVersion,
  recordApprovalDecision,
  requestDocumentApproval
} from "@/lib/supabase/version-service";
import { authMessage } from "@/lib/auth-routing";

export async function logVersionAction(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const versionLabel = String(formData.get("versionLabel") ?? "").trim();
  const changeSummary = String(formData.get("changeSummary") ?? "").trim() || undefined;

  if (!documentId || !versionLabel) {
    redirect(authMessage("/documents/version-control", "Document and version label are required."));
  }

  const result = await logDocumentVersion({ documentId, versionLabel, changeSummary });
  redirect(authMessage("/documents/version-control", result.message));
}

export async function requestApprovalAction(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "").trim();
  const documentVersionId = String(formData.get("documentVersionId") ?? "").trim() || undefined;
  const reviewerRole = String(formData.get("reviewerRole") ?? "ehs").trim();
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!documentId) redirect(authMessage("/documents/version-control", "Document ID required."));

  const result = await requestDocumentApproval({ documentId, documentVersionId, reviewerRole, notes });
  redirect(authMessage("/documents/version-control", result.message));
}

export async function approvalDecisionAction(formData: FormData) {
  const approvalId = String(formData.get("approvalId") ?? "").trim();
  const documentId = String(formData.get("documentId") ?? "").trim();
  const decision = String(formData.get("decision") ?? "") as "approved" | "rejected";
  const notes = String(formData.get("notes") ?? "").trim() || undefined;

  if (!approvalId || !documentId) {
    redirect(authMessage("/documents/version-control", "Missing approval or document ID."));
  }

  const result = await recordApprovalDecision({ approvalId, documentId, decision, notes });
  redirect(authMessage("/documents/version-control", result.message));
}
