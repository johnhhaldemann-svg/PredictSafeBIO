import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, KeyRound, ShieldCheck, UserCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { updateAccountProfileAction, updateCompanyProfileAction } from "./actions";
import { companyProfileToEditableText } from "@/lib/account-profile";
import { getAccountSummary } from "@/lib/supabase/data";

type AccountPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const account = await getAccountSummary();

  if (!account.signedIn) {
    redirect("/login?next=/account");
  }

  const companyText = account.companyProfile ? companyProfileToEditableText(account.companyProfile) : null;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Account</p>
          <h1>Account & workspace settings</h1>
        </header>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        <section className="profile-grid">
          {[
            ["Email", account.userEmail ?? "Unknown"],
            ["Full name", account.fullName ?? "Not set"],
            ["Role", account.role ?? "Not assigned"],
            ["Organization ID", account.organizationId ?? "Onboarding required"]
          ].map(([label, value]) => (
            <article className="profile-row" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </section>

        <section className="split-list wide">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Profile</p>
                <h2>Update display name</h2>
              </div>
              <UserCircle size={22} />
            </div>
            <form action={updateAccountProfileAction} className="document-form">
              <input type="hidden" name="returnTo" value="/account" />
              <label>
                Full name
                <input name="fullName" defaultValue={account.fullName ?? account.userEmail ?? ""} required />
              </label>
              <button className="button-primary" type="submit">
                Save profile
              </button>
            </form>
          </div>

          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Security</p>
                <h2>Password access</h2>
              </div>
              <KeyRound size={22} />
            </div>
            <p className="muted">
              Password changes use the same Supabase recovery-safe path as reset links. Role and organization assignment are read-only here.
            </p>
            <Link className="button-secondary" href="/account/password">
              Update password
            </Link>
          </div>
        </section>

        {account.needsOnboarding ? (
          <section className="panel inline-action-panel">
            <div>
              <p className="section-label">Onboarding</p>
              <h2>Organization setup required</h2>
              <p className="muted">Finish onboarding before editing company profile and workspace basics.</p>
            </div>
            <Link className="button-primary" href="/onboarding">
              Finish onboarding
            </Link>
          </section>
        ) : null}

        {account.companyProfile && companyText ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Company Profile Intelligence</p>
                <h2>Workspace basics</h2>
              </div>
              <Building2 size={22} />
            </div>
            <form action={updateCompanyProfileAction} className="document-form">
              <input type="hidden" name="returnTo" value="/account" />
              <div className="form-grid">
                <label>
                  Company name
                  <input name="companyName" defaultValue={account.companyProfile.companyName} required />
                </label>
                <label>
                  Primary site
                  <input name="primarySite" defaultValue={account.companyProfile.primarySite} required />
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
              <div className="guardrail-box">
                <ShieldCheck size={18} />
                <span>Company profile edits are saved as workspace configuration and recorded in the audit log.</span>
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
