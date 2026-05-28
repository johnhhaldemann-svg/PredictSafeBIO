import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import { getIntelligenceFoundationWorkbenchInput } from "@/lib/supabase/data";

export default async function WorkbenchPage() {
  const initialInput = await getIntelligenceFoundationWorkbenchInput();

  return (
    <AppShell>
      <WorkbenchClient initialInput={initialInput} />
    </AppShell>
  );
}
