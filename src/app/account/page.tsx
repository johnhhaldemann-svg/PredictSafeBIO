export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, KeyRound, UserCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { CompanyProfileSummary } from "@/components/CompanyProfileForm";
import { updateAccountProfileAction } from "./actions";
import { getAccountSummary } from "@/lib/supabase/data";

type AccountPageProps = {
  searchParams: Promise<{ message?: string; success?: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const account = await getAccountSummary().catch(() => ({ signedIn: false as const, needsOnboarding: false, userEmail: undefined, fullName: undefined, role: undefined, organizationId: undefined, companyProfile: undefined }));

  if (!account.signedIn) {
    redirect("/login?next=/account");
  }

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Account</p>
          <h1>Account & workspace settings</h1>
        </header>

        {params.success && <div className="verification-pass-box"><span>✓ {params.success}</span></div>}
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
              Password changes use the same secure path as reset links. Role and organization assignment are managed by your workspace owner.
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

        {account.companyProfile ? (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Company Profile Intelligence</p>
                <h2>{account.companyProfile.companyName}</h2>
              </div>
              <Building2 size={22} />
            </div>
            <CompanyProfileSummary profile={account.companyProfile} />
            <div className="guardrail-box">
              <span>
                Company configuration now lives in one place.{" "}
                <Link className="text-link" href="/account/company">Manage company settings →</Link>
              </span>
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
