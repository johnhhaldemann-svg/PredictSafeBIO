export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, GitBranch, Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CompanyProfileForm, CompanyProfileSummary } from "@/components/CompanyProfileForm";
import { isAdminRole } from "@/lib/role-permissions";
import { getAccountSummary, getCompanyProfile, getIntelligenceFoundationSummary } from "@/lib/supabase/data";

type Props = { searchParams: Promise<{ message?: string }> };

/**
 * /account/company — canonical Company Settings.
 *
 * Single home for company configuration (company_profiles fields). Owners edit;
 * members get a read-only view. BioType branching is operational and lives in
 * the Compliance Map — shown here read-only with a link.
 */
export default async function CompanySettingsPage({ searchParams }: Props) {
  const params = await searchParams;
  const account = await getAccountSummary();

  if (!account.signedIn) redirect("/login?next=/account/company");
  if (account.needsOnboarding || !account.organizationId) redirect("/onboarding");

  const [companyProfile, foundation] = await Promise.all([
    getCompanyProfile(),
    getIntelligenceFoundationSummary(),
  ]);
  const canEdit = isAdminRole(account.role);
  const selectedBioTypes = foundation.biotypes.filter((b) => b.role !== "available");

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Company Settings</p>
            <h1>{companyProfile.companyName}</h1>
            <p className="muted">
              Your company&rsquo;s configuration — operating context, programs, and review owners. This
              feeds the AI scoring context across the workspace.
            </p>
          </div>
        </header>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        {!canEdit && (
          <section className="panel access-banner access-readonly">
            <strong><Lock size={14} style={{ verticalAlign: "-2px", marginRight: 6 }} />Read-only</strong>
            <span>Only workspace owners can edit company settings. Contact your owner to make changes.</span>
          </section>
        )}

        {/* Company configuration — edit (owner) or read-only (member) */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Company Profile Intelligence</p>
              <h2>Workspace configuration</h2>
            </div>
            <Building2 size={22} />
          </div>
          {canEdit ? (
            <CompanyProfileForm profile={companyProfile} returnTo="/account/company" />
          ) : (
            <CompanyProfileSummary profile={companyProfile} />
          )}
        </section>

        {/* BioType operating profile — read-only; edited in the Compliance Map workflow */}
        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">BioType Branching Engine</p>
              <h2>Selected operating profile</h2>
            </div>
            <GitBranch size={22} />
          </div>
          {selectedBioTypes.length > 0 ? (
            <div className="action-list">
              {selectedBioTypes.map((biotype) => (
                <article className="action-row" key={biotype.name}>
                  <div>
                    <strong>{biotype.name}</strong>
                    <span>{biotype.role}</span>
                  </div>
                  <p>{biotype.focus} Requirements: {biotype.requirements}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">No BioTypes selected yet.</p>
          )}
          <div className="guardrail-box">
            <span>
              BioType selection is part of the compliance workflow.{" "}
              <Link className="text-link" href="/foundation">Edit in the Compliance Map →</Link>
            </span>
          </div>
        </section>

        <section className="panel inline-action-panel">
          <div>
            <p className="section-label">Related</p>
            <h2>Team &amp; account</h2>
            <p className="muted">Manage members and your personal account separately.</p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link className="button-secondary" href="/account/team">Team</Link>
            <Link className="button-secondary" href="/account">Account</Link>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
