import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "./OnboardingWizard";

type OnboardingPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.organization_id) {
    redirect("/workbench");
  }

  // Check for a pending invite. Join the org name so we can display it in the wizard.
  const { data: pendingInvite } = await supabase
    .from("workspace_invitations")
    .select("id, role, organization_id")
    .eq("email", (user.email ?? "").toLowerCase())
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const isInvitee = Boolean(pendingInvite);

  // Fetch the org name for the invite welcome screen.
  let inviteeOrgName: string | undefined;
  if (pendingInvite?.organization_id) {
    const { data: org } = await supabase
      .from("organizations")
      .select("name")
      .eq("id", pendingInvite.organization_id)
      .maybeSingle();
    inviteeOrgName = org?.name ?? undefined;
  }

  const inviteOnly = process.env.NEXT_PUBLIC_INVITE_ONLY === "true";
  const blockedNoInvite = inviteOnly && !isInvitee;

  return (
    <main className="onboarding-page">
      <section className="onboarding-panel" aria-label="Workspace setup wizard">
        {params.message && <p className="form-message">{params.message}</p>}
        <OnboardingWizard
          isInvitee={isInvitee}
          inviteeRole={pendingInvite?.role ?? undefined}
          inviteeOrgName={inviteeOrgName}
          blockedNoInvite={blockedNoInvite}
        />
      </section>
    </main>
  );
}
