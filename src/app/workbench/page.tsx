import { AppShell } from "@/components/AppShell";
import { FoundationReviewActionsPanel } from "@/components/FoundationReviewActionsPanel";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import { getFoundationAdminAccessSummary, getFoundationReviewActionsSummary, getIntelligenceFoundationWorkbenchInput } from "@/lib/supabase/data";

export default async function WorkbenchPage() {
  const [initialInput, foundationActions, adminAccess] = await Promise.all([
    getIntelligenceFoundationWorkbenchInput(),
    getFoundationReviewActionsSummary(),
    getFoundationAdminAccessSummary()
  ]);

  return (
    <AppShell>
      <div className="page-stack">
        <WorkbenchClient foundationActions={foundationActions} initialInput={initialInput} />
        <FoundationReviewActionsPanel
          actions={foundationActions.slice(0, 6)}
          canManage={adminAccess.isOwner}
          emptyMessage="No generated Foundation review actions yet."
          title="Workbench follow-through"
        />
      </div>
    </AppShell>
  );
}
