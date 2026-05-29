import { AppShell } from "@/components/AppShell";
import { getCompanyProfile, getIntelligenceFoundationSummary } from "@/lib/supabase/data";

export default async function CompanyProfilePage() {
  const [companyProfile, foundation] = await Promise.all([getCompanyProfile(), getIntelligenceFoundationSummary()]);
  const selectedBioTypes = foundation.biotypes.filter((biotype) => biotype.role !== "available");

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Company Profile Intelligence</p>
          <h1>{companyProfile.companyName}</h1>
        </header>
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
      </div>
    </AppShell>
  );
}
