import { draftHumanReviewLabel } from "@/lib/bio-ai/source-artifacts";
import type { DocumentGapRecommendation, DocumentMetadata, DocumentUpdateRecommendation } from "@/lib/bio-ai/types";

export function generateDocumentGapRecommendations(document: DocumentMetadata): DocumentGapRecommendation[] {
  const recommendations: DocumentGapRecommendation[] = [];
  const today = new Date();
  const nextReview = document.nextReviewDate ? new Date(document.nextReviewDate) : null;

  if (document.status === "unknown" || document.status === "obsolete") {
    recommendations.push({
      documentId: document.id,
      title: "Clarify current document status",
      severity: "high",
      reason: "The document status is unknown or obsolete, so users should not rely on it without owner review.",
      recommendedOwner: document.ownerRole,
      draftOnly: true,
      humanReviewRequired: true
    });
  }

  if (!document.ownerRole) {
    recommendations.push({
      documentId: document.id,
      title: "Assign responsible review owner",
      severity: "moderate",
      reason: "Document governance requires a named owner role before changes can be reviewed.",
      recommendedOwner: "qa",
      draftOnly: true,
      humanReviewRequired: true
    });
  }

  if (!document.relatedProcess || !document.area) {
    recommendations.push({
      documentId: document.id,
      title: "Add process and area metadata",
      severity: "moderate",
      reason: "Missing process or area metadata makes impact assessment harder during deviations, CAPA, or change control.",
      recommendedOwner: document.ownerRole,
      draftOnly: true,
      humanReviewRequired: true
    });
  }

  if (!nextReview || nextReview < today) {
    recommendations.push({
      documentId: document.id,
      title: "Schedule human document review",
      severity: "high",
      reason: "The next review date is missing or overdue. A qualified owner should assess current use before relying on the document.",
      recommendedOwner: document.ownerRole,
      draftOnly: true,
      humanReviewRequired: true
    });
  }

  for (const gap of document.gaps ?? []) {
    recommendations.push({
      documentId: document.id,
      title: `Resolve documented gap: ${gap}`,
      severity: "moderate",
      reason: "A recorded gap should be reviewed and either remediated or linked to an approved quality workflow.",
      recommendedOwner: document.ownerRole,
      draftOnly: true,
      humanReviewRequired: true
    });
  }

  return recommendations;
}

export function generateDocumentUpdateRecommendations(document: DocumentMetadata): DocumentUpdateRecommendation[] {
  return generateDocumentGapRecommendations(document).slice(0, 4).map((gap) => ({
    documentId: document.id,
    title: `Draft update for ${gap.title.toLowerCase()}`,
    proposedChange: `Add or revise the relevant section of "${document.title}" to address: ${gap.reason}`,
    rationale: "This is a draft recommendation generated from document metadata. It must be reviewed by the responsible human owner before use.",
    label: draftHumanReviewLabel,
    ownerRole: gap.recommendedOwner
  }));
}
