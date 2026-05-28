import { AppShell } from "@/components/AppShell";
import { WorkbenchClient } from "@/components/WorkbenchClient";
import { getMapAlignedWorkbenchInput } from "@/lib/supabase/data";

export default async function WorkbenchPage() {
  const initialInput = await getMapAlignedWorkbenchInput();

  return (
    <AppShell>
      <WorkbenchClient initialInput={initialInput} />
    </AppShell>
  );
}
