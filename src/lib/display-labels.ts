/**
 * Human-readable display labels for raw database values.
 * Used when rendering stored enum/snake_case values in UI data cards.
 */

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  sop: "SOP",
  protocol: "Protocol",
  training: "Training",
  validation: "Validation",
  policy: "Policy",
  other: "Other"
};

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  obsolete: "Obsolete",
  unknown: "Unknown",
  pending: "Pending",
  rejected: "Rejected"
};

const OWNER_ROLE_LABELS: Record<string, string> = {
  responsible_scientist: "Responsible Scientist",
  principal_investigator: "Principal Investigator",
  qa: "QA",
  biosafety_officer: "Biosafety Officer",
  ehs: "EHS",
  manufacturing_lead: "Manufacturing Lead",
  validation_lead: "Validation Lead",
  regulatory_affairs: "Regulatory Affairs"
};

/** Formats a raw document type value for display. */
export function formatDocumentType(value: string): string {
  return DOCUMENT_TYPE_LABELS[value] ?? value.replace(/_/g, " ");
}

/** Formats a raw document/approval status value for display. */
export function formatDocumentStatus(value: string): string {
  return DOCUMENT_STATUS_LABELS[value] ?? value.replace(/_/g, " ");
}

/** Formats a raw owner role value for display. */
export function formatOwnerRole(value: string): string {
  return OWNER_ROLE_LABELS[value] ?? value.replace(/_/g, " ");
}
