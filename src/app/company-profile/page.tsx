export const dynamic = "force-dynamic";

import { AppShell } from "@/components/AppShell";
import { updateCompanyProfileAction } from "@/app/account/actions";
import { companyProfileToEditableText } from "@/lib/account-profile";
import { getCompanyProfile, getIntelligenceFoundationSummary } from "@/lib/supabase/data";

type CompanyProfilePageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function CompanyProfilePage({ searchParams }: CompanyProfilePageProps) {
  const params = await searchParams;
  const [companyProfile, foundation] = await Promise.all([getCompanyProfile(), getIntelligenceFoundationSummary()]);
  const selectedBioTypes = foundation.biotypes.filter((biotype) => biotype.role !== "available");
  const companyText = companyProfileToEditableText(companyProfile);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Company Profile Intelligence</p>
          <h1>{companyProfile.companyName}</h1>
        </header>
        {params.message ? <p className="form-message">{params.message}</p> : null}
        <section className="profile-grid">
          {[
            ["Primary site", companyProfile.primarySite],
            ["Operating areas", companyProfile.operatingAreas.join(", ")],
            ["Programs", companyProfile.programs.join(", ")],
            ["Quality scope", companyProfile.qualitySystemScope.join(", ")],
            ["Biosafety levels", companyProfile.biosafetyLevels.join(", ")],
            ["Review owners", companyProfile.reviewOwnerRoles.join(", ")],
            ["Document families", companyProfile.documentFamilies.join(", ")]
          ].map(([label, value]) => (
            <article className="profile-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">BioType Branching Engine</p>
              <h2>Selected operating profile</h2>
            </div>
          </div>
          <div className="action-list">
            {selectedBioTypes.map((biotype) => (
              <article className="action-row" key={biotype.name}>
                <div>
                  <strong>{biotype.name}</strong>
                  <span>{biotype.role}</span>
                </div>
                <p>
                  {biotype.focus} Requirements: {biotype.requirements}
                </p>
              </article>
            ))}
          </div>
          <div className="guardrail-box">
            <span>{foundation.guardrailText}</span>
          </div>
        </section>
        {companyProfile.id ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Workspace Settings</p>
                <h2>Edit company profile basics</h2>
              </div>
            </div>
            <form action={updateCompanyProfileAction} className="document-form">
              <input type="hidden" name="returnTo" value="/company-profile" />
              <div className="form-grid">
                <label>
                  Company name
                  <input name="companyName" defaultValue={companyProfile.companyName} required />
                </label>
                <label>
                  Primary site
                  <input name="primarySite" defaultValue={companyProfile.primarySite} required />
                </label>
              </div>
              <div className="form-grid wide-fields">
                <label>
                  Operating areas
                  <textarea name="operatingAreas" defaultValue={companyText.operatingAreas} rows={5} />
                </label>
                <label>
                  Programs
                  <textarea name="programs" defaultValue={companyText.programs} rows={5} />
                </label>
                <label>
                  Quality scope
                  <textarea name="qualitySystemScope" defaultValue={companyText.qualitySystemScope} rows={5} />
                </label>
                <label>
                  Biosafety levels
                  <textarea name="biosafetyLevels" defaultValue={companyText.biosafetyLevels} rows={5} />
                </label>
                <label>
                  Review owner roles
                  <textarea name="reviewOwnerRoles" defaultValue={companyText.reviewOwnerRoles} rows={5} />
                </label>
                <label>
                  Document families
                  <textarea name="documentFamilies" defaultValue={companyText.documentFamilies} rows={5} />
                </label>
              </div>
              <button className="button-primary" type="submit">
                Save company profile
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
