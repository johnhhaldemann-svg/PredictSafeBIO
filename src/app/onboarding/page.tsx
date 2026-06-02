import { redirect } from "next/navigation";
import { ClipboardCheck, ShieldAlert } from "lucide-react";
import { completeOnboardingAction } from "@/app/auth/actions";
import { demoCompanyProfile } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasValidInviteForCurrentUser } from "@/lib/supabase/invite-service";

type OnboardingPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
  if (profile?.organization_id) {
    redirect("/workbench");
  }

  // Invite-only guard: when NEXT_PUBLIC_INVITE_ONLY=true, a valid pending invite
  // is required. In demo mode or when invite-only is off, this is a no-op.
  const inviteValid = await hasValidInviteForCurrentUser();

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel" aria-labelledby="onboarding-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Organization setup</p>
            <h1 id="onboarding-title">Set up your workspace</h1>
          </div>
          <ClipboardCheck size={24} />
        </div>
        <p className="auth-copy">
          Tell us about your organization. This shapes your biosafety assessments, document library, and audit-readiness tracking.
        </p>
        {params.message ? <p className="form-message">{params.message}</p> : null}
        {!inviteValid && (
          <div className="auth-hardening-warning" role="alert">
            <ShieldAlert size={15} />
            <span>
              <strong>Invite required.</strong> This workspace is invite-only.
              Ask your organization owner to send you an invite link before continuing.
            </span>
          </div>
        )}
        <form action={completeOnboardingAction} className="onboarding-form">
          <div className="form-grid">
            <label>
              Organization name
              <input
                name="organizationName"
                placeholder={demoCompanyProfile.companyName}
                required
                autoComplete="organization"
              />
            </label>
            <label>
              Your full name
              <input
                name="fullName"
                placeholder="e.g. Dr. Jane Smith"
                defaultValue=""
                required
                autoComplete="name"
              />
            </label>
            <label>
              Company name
              <input
                name="companyName"
                placeholder={demoCompanyProfile.companyName}
                required
                autoComplete="organization"
              />
            </label>
            <label>
              Primary site
              <input
                name="primarySite"
                placeholder={demoCompanyProfile.primarySite}
                autoComplete="off"
              />
            </label>
          </div>

          <div className="onboarding-section-divider">
            <p className="section-label">Operating context — optional, helps personalize your workspace</p>
          </div>

          <div className="form-grid wide-fields">
            <label>
              Operating areas
              <textarea
                name="operatingAreas"
                placeholder={demoCompanyProfile.operatingAreas.join("\n")}
                rows={4}
              />
            </label>
            <label>
              Programs
              <textarea
                name="programs"
                placeholder={demoCompanyProfile.programs.join("\n")}
                rows={4}
              />
            </label>
            <label>
              Quality scope
              <textarea
                name="qualityScope"
                placeholder={demoCompanyProfile.qualitySystemScope.join("\n")}
                rows={4}
              />
            </label>
            <label>
              Biosafety levels
              <textarea
                name="biosafetyLevels"
                placeholder={demoCompanyProfile.biosafetyLevels.join("\n")}
                rows={4}
              />
            </label>
            <label>
              Review owner roles
              <textarea
                name="reviewOwnerRoles"
                placeholder={demoCompanyProfile.reviewOwnerRoles.join("\n")}
                rows={4}
              />
            </label>
            <label>
              Document families
              <textarea
                name="documentFamilies"
                placeholder={demoCompanyProfile.documentFamilies.join("\n")}
                rows={4}
              />
            </label>
          </div>

          <div className="onboarding-actions">
            <button className="button-primary" type="submit">
              Create workspace
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
