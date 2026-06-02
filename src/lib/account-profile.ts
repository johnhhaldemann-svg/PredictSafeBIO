import type { CompanyProfile, ReviewOwnerRole } from "@/lib/bio-ai/types";

export type AccountProfileUpdateInput = {
  fullName: string;
};

export type CompanyProfileUpdateInput = {
  companyName: string;
  primarySite: string;
  operatingAreas: string[];
  programs: string[];
  qualitySystemScope: string[];
  biosafetyLevels: string[];
  reviewOwnerRoles: ReviewOwnerRole[];
  documentFamilies: string[];
};

export function normalizeAccountProfileInput(input: { fullName?: unknown }): AccountProfileUpdateInput {
  return { fullName: normalizeRequiredText(input.fullName, "Full name") };
}

export function normalizeCompanyProfileInput(input: Record<string, unknown>): CompanyProfileUpdateInput {
  return {
    companyName: normalizeRequiredText(input.companyName, "Company name"),
    primarySite: normalizeRequiredText(input.primarySite, "Primary site"),
    operatingAreas: normalizeListText(input.operatingAreas),
    programs: normalizeListText(input.programs),
    qualitySystemScope: normalizeListText(input.qualitySystemScope),
    biosafetyLevels: normalizeListText(input.biosafetyLevels),
    reviewOwnerRoles: normalizeListText(input.reviewOwnerRoles) as ReviewOwnerRole[],
    documentFamilies: normalizeListText(input.documentFamilies)
  };
}

export function companyProfileToEditableText(profile: CompanyProfile) {
  return {
    operatingAreas: profile.operatingAreas.join("\n"),
    programs: profile.programs.join("\n"),
    qualitySystemScope: profile.qualitySystemScope.join("\n"),
    biosafetyLevels: profile.biosafetyLevels.join("\n"),
    reviewOwnerRoles: profile.reviewOwnerRoles.join("\n"),
    documentFamilies: profile.documentFamilies.join("\n")
  };
}

export function changedCompanyProfileFields(previous: CompanyProfile, next: CompanyProfileUpdateInput) {
  const changes: string[] = [];
  if (previous.companyName !== next.companyName) changes.push("companyName");
  if (previous.primarySite !== next.primarySite) changes.push("primarySite");
  if (!sameList(previous.operatingAreas, next.operatingAreas)) changes.push("operatingAreas");
  if (!sameList(previous.programs, next.programs)) changes.push("programs");
  if (!sameList(previous.qualitySystemScope, next.qualitySystemScope)) changes.push("qualitySystemScope");
  if (!sameList(previous.biosafetyLevels, next.biosafetyLevels)) changes.push("biosafetyLevels");
  if (!sameList(previous.reviewOwnerRoles, next.reviewOwnerRoles)) changes.push("reviewOwnerRoles");
  if (!sameList(previous.documentFamilies, next.documentFamilies)) changes.push("documentFamilies");
  return changes;
}

function normalizeRequiredText(value: unknown, label: string) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function normalizeListText(value: unknown) {
  const raw = typeof value === "string" ? value : "";
  const seen = new Set<string>();
  return raw
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function sameList(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
