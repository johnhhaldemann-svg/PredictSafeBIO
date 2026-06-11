import { redirect } from "next/navigation";
import { BookOpen, ClipboardCheck, HeartPulse, LayoutDashboard, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { completeOnboardingAction } from "@/app/auth/actions";
import { demoCompanyProfile } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: Promise<{ message?: string }>;
};

// What each role can access — shown during onboarding
const memberCapabilities = [
  { icon: LayoutDashboard, label: "Dashboard", detail: "Your personal safety activity summary" },
  { icon: HeartPulse,      label: "Hazard Screening", detail: "Submit Level 1 ergonomic and hazard screenings" },
  { icon: BookOpen,        label: "Programs (view)", detail: "Browse all 29 safety program tools and checklists" },
  { icon: ClipboardCheck,  label: "My Work", detail: "Track tasks and follow-up items assigned to you" },
];

const ownerCapabilities = [
  { icon: ShieldCheck,     label: "Full Risk & Compliance access", detail: "BioRisk scoring, compliance map, foundation audits" },
  { icon: ClipboardCheck,  label: "Inspections & CAPA", detail: "Schedule, conduct, and close inspections; manage corrective actions" },
  { icon: Users,           label: "Team management", detail: "Invite members, assign roles, manage workspace" },
  { icon: ShieldCheck,     label: "Level 2 evaluations", detail: "Conduct advanced ergonomic and hazard evaluations" },
  { icon: BookOpen,        label: "Reports & Audit log", detail: "Full audit trail and EHS reporting" },
];

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

  // A pending invitation addressed to this user's email means they JOIN an
  // existing company (RLS lets a user read invites for their own email). With no
  // invite they set up a new company as owner. completeOnboardingAction makes the
  // same determination server-side from the email match.
  const { data: pendingInvite } = await supabase
    .from("workspace_invitations")
    .select("id, role")
    .eq("email", (user.email ?? "").toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isJoiningAsInvitee = Boolean(pendingInvite);
  // Invite-only mode blocks self-serve company creation: no invite + flag on = blocked.
  const inviteOnly = process.env.NEXT_PUBLIC_INVITE_ONLY === "true";
  const blockedNoInvite = inviteOnly && !isJoiningAsInvitee;

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel" aria-labelledby="onboarding-title">

        {/* Role context header */}
        <div className="panel-heading">
          <div>
            <p className="section-label">
              {isJoiningAsInvitee ? "Joining as Team Member" : "Setting up as Organization Owner"}
            </p>
            <h1 id="onboarding-title">
              {isJoiningAsInvitee ? "Join your workspace" : "Set up your workspace"}
            </h1>
          </div>
          <ClipboardCheck size={24} />
        </div>

        <p className="auth-copy">
          {isJoiningAsInvitee
            ? "You were invited to join an existing workspace. Complete your profile to get started."
            : "You are setting up PredictSafeBIO for your organization. Run biosafety assessments, manage compliance, and track HSE operations. As the owner you will have full access and can invite team members."}
        </p>

        {/* Role capabilities overview */}
        <div className="onboarding-role-cards">
          <div className={`onboarding-role-card ${isJoiningAsInvitee ? "" : "onboarding-role-card--active"}`}>
            <div className="onboarding-role-card-header">
              <span className="status-current">Owner</span>
              <p>Full workspace access</p>
            </div>
            <ul>
              {ownerCapabilities.map((c) => (
                <li key={c.label}>
                  <c.icon size={14} />
                  <span><strong>{c.label}</strong> — {c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className={`onboarding-role-card ${isJoiningAsInvitee ? "onboarding-role-card--active" : ""}`}>
            <div className="onboarding-role-card-header">
              <span className="status-needs-review">Team Member</span>
              <p>Screening &amp; self-service access</p>
            </div>
            <ul>
              {memberCapabilities.map((c) => (
                <li key={c.label}>
                  <c.icon size={14} />
                  <span><strong>{c.label}</strong> — {c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        {blockedNoInvite && (
          <div className="auth-hardening-warning" role="alert">
            <ShieldAlert size={15} />
            <span>
              <strong>Invite required.</strong> This workspace is invite-only.
              Ask your organization owner to send you an invite link before continuing.
            </span>
          </div>
        )}

        <form action={completeOnboardingAction} className="onboarding-form">
          <div className="onboarding-section-divider">
            <p className="section-label">Your details</p>
          </div>
          <div className="form-grid">
            <label>
              Your full name
              <input name="fullName" placeholder="e.g. Dr. Jane Smith" defaultValue="" required autoComplete="name" />
            </label>
            {!isJoiningAsInvitee && (
              <>
                <label>
                  Organization name
                  <input name="organizationName" placeholder={demoCompanyProfile.companyName} required autoComplete="organization" />
                </label>
                <label>
                  Company name
                  <input name="companyName" placeholder={demoCompanyProfile.companyName} required autoComplete="organization" />
                </label>
                <label>
                  Primary site
                  <input name="primarySite" placeholder={demoCompanyProfile.primarySite} autoComplete="off" />
                </label>
              </>
            )}
          </div>

          {!isJoiningAsInvitee && (
            <>
              <div className="onboarding-section-divider">
                <p className="section-label">Industry — sets your workspace labels and risk model</p>
              </div>
              <div className="onboarding-vertical-choice" role="radiogroup" aria-label="Industry vertical">
                <label className="onboarding-vertical-option">
                  <input type="radio" name="vertical" value="biotech_pharma" defaultChecked />
                  <span>
                    <strong>Biotech / Pharma</strong>
                    <small>Labs, cleanrooms, biosafety — PredictSafe BIO</small>
                  </span>
                </label>
                <label className="onboarding-vertical-option">
                  <input type="radio" name="vertical" value="general_manufacturing" />
                  <span>
                    <strong>General Manufacturing</strong>
                    <small>Production, assembly, warehousing — PredictSafe MFG</small>
                  </span>
                </label>
              </div>

              <div className="onboarding-section-divider">
                <p className="section-label">Operating context — optional, helps personalize your workspace</p>
              </div>

              <div className="form-grid wide-fields">
                <label>
                  Operating areas
                  <textarea name="operatingAreas" placeholder={demoCompanyProfile.operatingAreas.join("\n")} rows={4} />
                </label>
                <label>
                  Programs
                  <textarea name="programs" placeholder={demoCompanyProfile.programs.join("\n")} rows={4} />
                </label>
                <label>
                  Quality scope
                  <textarea name="qualityScope" placeholder={demoCompanyProfile.qualitySystemScope.join("\n")} rows={4} />
                </label>
                <label>
                  Biosafety levels
                  <textarea name="biosafetyLevels" placeholder={demoCompanyProfile.biosafetyLevels.join("\n")} rows={4} />
                </label>
                <label>
                  Review owner roles
                  <textarea name="reviewOwnerRoles" placeholder={demoCompanyProfile.reviewOwnerRoles.join("\n")} rows={4} />
                </label>
                <label>
                  Document families
                  <textarea name="documentFamilies" placeholder={demoCompanyProfile.documentFamilies.join("\n")} rows={4} />
                </label>
              </div>
            </>
          )}

          <div className="onboarding-actions">
            <button className="button-primary" type="submit" disabled={blockedNoInvite}>
              {isJoiningAsInvitee ? "Join workspace" : "Create workspace"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
