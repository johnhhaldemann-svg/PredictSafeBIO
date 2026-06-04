import { ShieldCheck } from "lucide-react";
import { updateCompanyProfileAction } from "@/app/account/actions";
import { companyProfileToEditableText } from "@/lib/account-profile";
import type { CompanyProfile } from "@/lib/bio-ai/types";

/**
 * Canonical editor for company_profiles configuration. Used only by the Company
 * Settings page (/account/company). Owners edit; members see a read-only summary
 * (rendered by the page, not here).
 */
export function CompanyProfileForm({
  profile,
  returnTo,
}: {
  profile: CompanyProfile;
  returnTo: string;
}) {
  const text = companyProfileToEditableText(profile);
  return (
    <form action={updateCompanyProfileAction} className="document-form">
      <input type="hidden" name="returnTo" value={returnTo} />
      <div className="form-grid">
        <label>
          Company name
          <input name="companyName" defaultValue={profile.companyName} required />
        </label>
        <label>
          Primary site
          <input name="primarySite" defaultValue={profile.primarySite} required />
        </label>
      </div>
      <div className="form-grid wide-fields">
        <label>
          Operating areas
          <textarea name="operatingAreas" defaultValue={text.operatingAreas} rows={5} />
        </label>
        <label>
          Programs
          <textarea name="programs" defaultValue={text.programs} rows={5} />
        </label>
        <label>
          Quality scope
          <textarea name="qualitySystemScope" defaultValue={text.qualitySystemScope} rows={5} />
        </label>
        <label>
          Biosafety levels
          <textarea name="biosafetyLevels" defaultValue={text.biosafetyLevels} rows={5} />
        </label>
        <label>
          Review owner roles
          <textarea name="reviewOwnerRoles" defaultValue={text.reviewOwnerRoles} rows={5} />
        </label>
        <label>
          Document families
          <textarea name="documentFamilies" defaultValue={text.documentFamilies} rows={5} />
        </label>
      </div>
      <div className="guardrail-box">
        <ShieldCheck size={18} />
        <span>Company profile edits are saved as workspace configuration and recorded in the audit log.</span>
      </div>
      <button className="button-primary" type="submit">
        Save company profile
      </button>
    </form>
  );
}

/** Read-only field grid for members (and a quick summary anywhere). */
export function CompanyProfileSummary({ profile }: { profile: CompanyProfile }) {
  const rows: Array<[string, string]> = [
    ["Primary site", profile.primarySite],
    ["Operating areas", profile.operatingAreas.join(", ")],
    ["Programs", profile.programs.join(", ")],
    ["Quality scope", profile.qualitySystemScope.join(", ")],
    ["Biosafety levels", profile.biosafetyLevels.join(", ")],
    ["Review owners", profile.reviewOwnerRoles.join(", ")],
    ["Document families", profile.documentFamilies.join(", ")],
  ];
  return (
    <section className="profile-grid">
      {rows.map(([label, value]) => (
        <article className="profile-row" key={label}>
          <span>{label}</span>
          <strong>{value || "—"}</strong>
        </article>
      ))}
    </section>
  );
}
