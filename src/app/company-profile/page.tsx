import { AppShell } from "@/components/AppShell";
import { getCompanyProfile } from "@/lib/supabase/data";

export default async function CompanyProfilePage() {
  const companyProfile = await getCompanyProfile();

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Company profile intake</p>
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
      </div>
    </AppShell>
  );
}
