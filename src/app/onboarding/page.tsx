import { redirect } from "next/navigation";
import { ClipboardCheck } from "lucide-react";
import { completeOnboardingAction } from "@/app/auth/actions";
import { demoCompanyProfile } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel" aria-labelledby="onboarding-title">
        <div className="panel-heading">
          <div>
            <p className="section-label">Organization setup</p>
            <h1 id="onboarding-title">Seed your MVP workspace</h1>
          </div>
          <ClipboardCheck size={24} />
        </div>
        <p className="auth-copy">
          These defaults come from the current demo company profile so the live Supabase path starts with the same biotech operating context.
        </p>
        {params.message ? <p className="form-message">{params.message}</p> : null}
        <form action={completeOnboardingAction} className="onboarding-form">
          <div className="form-grid">
            <label>
              Organization name
              <input name="organizationName" defaultValue={demoCompanyProfile.companyName} required />
            </label>
            <label>
              Full name
              <input name="fullName" defaultValue={user.email ?? ""} required />
            </label>
            <label>
              Company name
              <input name="companyName" defaultValue={demoCompanyProfile.companyName} required />
            </label>
            <label>
              Primary site
              <input name="primarySite" defaultValue={demoCompanyProfile.primarySite} required />
            </label>
          </div>

          <div className="form-grid wide-fields">
            <label>
              Operating areas
              <textarea name="operatingAreas" defaultValue={demoCompanyProfile.operatingAreas.join("\n")} rows={5} />
            </label>
            <label>
              Programs
              <textarea name="programs" defaultValue={demoCompanyProfile.programs.join("\n")} rows={5} />
            </label>
            <label>
              Quality scope
              <textarea name="qualityScope" defaultValue={demoCompanyProfile.qualitySystemScope.join("\n")} rows={5} />
            </label>
            <label>
              Biosafety levels
              <textarea name="biosafetyLevels" defaultValue={demoCompanyProfile.biosafetyLevels.join("\n")} rows={5} />
            </label>
            <label>
              Review owner roles
              <textarea name="reviewOwnerRoles" defaultValue={demoCompanyProfile.reviewOwnerRoles.join("\n")} rows={5} />
            </label>
            <label>
              Document families
              <textarea name="documentFamilies" defaultValue={demoCompanyProfile.documentFamilies.join("\n")} rows={5} />
            </label>
          </div>

          <div className="onboarding-actions">
            <button className="button-primary" type="submit">
              Create organization and profile
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
