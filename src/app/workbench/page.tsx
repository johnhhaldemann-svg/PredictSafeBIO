import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import { getFoundationReviewActionsSummary, getIntelligenceFoundationWorkbenchInput } from "@/lib/supabase/data";

export default async function WorkbenchPage() {
  const [initialInput, foundationActions] = await Promise.all([
    getIntelligenceFoundationWorkbenchInput(),
    getFoundationReviewActionsSummary()
  ]);

  return (
    <AppShell>
      <WorkbenchClient foundationActions={foundationActions} initialInput={initialInput} />
    </AppShell>
  );
}
