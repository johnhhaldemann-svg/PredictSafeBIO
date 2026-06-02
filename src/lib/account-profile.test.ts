import { describe, expect, it } from "vitest";
import { changedCompanyProfileFields, normalizeAccountProfileInput, normalizeCompanyProfileInput } from "./account-profile";
import type { CompanyProfile } from "@/lib/bio-ai/types";

describe("account profile helpers", () => {
  it("normalizes account profile updates", () => {
    expect(normalizeAccountProfileInput({ fullName: "  Ada Lovelace  " })).toEqual({ fullName: "Ada Lovelace" });
    expect(() => normalizeAccountProfileInput({ fullName: " " })).toThrow("Full name is required.");
  });

  it("normalizes company profile text fields and de-duplicates lists", () => {
    expect(
      normalizeCompanyProfileInput({
        companyName: "  NorthStar BioLabs ",
        primarySite: "  Main campus ",
        operatingAreas: "QC Lab\nQC Lab, Pilot Suite",
        programs: "Biosafety\nTraining",
        qualitySystemScope: "R&D",
        biosafetyLevels: "BSL-2",
        reviewOwnerRoles: "qa\nbiosafety_officer",
        documentFamilies: "SOP\nTemplate"
      })
    ).toEqual({
      companyName: "NorthStar BioLabs",
      primarySite: "Main campus",
      operatingAreas: ["QC Lab", "Pilot Suite"],
      programs: ["Biosafety", "Training"],
      qualitySystemScope: ["R&D"],
      biosafetyLevels: ["BSL-2"],
      reviewOwnerRoles: ["qa", "biosafety_officer"],
      documentFamilies: ["SOP", "Template"]
    });
  });

  it("reports changed company profile fields for audit payloads", () => {
    const previous: CompanyProfile = {
      companyName: "NorthStar",
      primarySite: "Main",
      operatingAreas: ["QC"],
      programs: ["Biosafety"],
      qualitySystemScope: ["R&D"],
      biosafetyLevels: ["BSL-2"],
      reviewOwnerRoles: ["qa"],
      documentFamilies: ["SOP"]
    };

    expect(changedCompanyProfileFields(previous, { ...previous, primarySite: "Pilot", programs: ["Biosafety", "Training"] })).toEqual([
      "primarySite",
      "programs"
    ]);
  });
});
