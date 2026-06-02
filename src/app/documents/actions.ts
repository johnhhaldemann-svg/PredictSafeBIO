"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { DocumentMetadata } from "@/lib/bio-ai/types";
import { getDocument, persistDocumentRecommendations, saveDocumentMetadata } from "@/lib/supabase/data";

function field(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function listField(formData: FormData, name: string) {
  return field(formData, name)
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
}

function redirectWithMessage(path: string, message: string): never {
  const params = new URLSearchParams({ message });
  redirect(`${path}?${params.toString()}`);
}

export async function createDocumentMetadataAction(formData: FormData) {
  const title = field(formData, "title");
  if (!title) {
    redirectWithMessage("/documents", "Document title is required.");
  }

  const documentFile = formData.get("documentFile");
  const result = await saveDocumentMetadata({
    title,
    documentType: field(formData, "documentType") as DocumentMetadata["documentType"],
    status: field(formData, "status") as DocumentMetadata["status"],
    ownerRole: field(formData, "ownerRole") as DocumentMetadata["ownerRole"],
    area: field(formData, "area") || null,
    relatedProcess: field(formData, "relatedProcess") || null,
    revision: field(formData, "revision") || null,
    effectiveDate: field(formData, "effectiveDate") || null,
    nextReviewDate: field(formData, "nextReviewDate") || null,
    gaps: listField(formData, "gaps"),
    file: documentFile instanceof File ? documentFile : null
  });

  const document = result.ok ? result.document : undefined;
  if (!document?.id) {
    redirectWithMessage("/documents", result.message ?? "Document metadata could not be saved.");
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${document.id}`);
  if (result.message) {
    redirectWithMessage(`/documents/${document.id}`, result.message);
  }
  redirect(`/documents/${document.id}`);
}

export async function persistDocumentRecommendationsAction(formData: FormData) {
  const documentId = field(formData, "documentId");
  if (!documentId) {
    redirectWithMessage("/documents", "Document ID is required.");
  }

  const document = await getDocument(documentId);
  if (!document) {
    redirectWithMessage("/documents", "Document was not found.");
  }

  const result = await persistDocumentRecommendations(document);
  if (!result.ok) {
    redirectWithMessage(`/documents/${documentId}`, "Sign in to your workspace to save document recommendations.");
  }

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/admin/audit");
  redirectWithMessage(`/documents/${documentId}`, "Draft document recommendations persisted and audit event created.");
}
