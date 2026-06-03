export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createServerClient } from "@/lib/supabase/server";
import { isRiskCellsEnabled } from "@/lib/feature-flags";

/**
 * Project → Risk Cells — /project/[projectId]/risk-cells
 * AMAYA precursor / control / failure / behavior / event cell intelligence.
 * Gated by NEXT_PUBLIC_FEATURE_RISK_CELLS flag. Placeholder until module is built.
 */
type Props = { params: Promise<{ projectId: string }> };

export default async function ProjectRiskCellsPage({ params }: Props) {
  const { projectId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Risk Cells</h1>
        <p className="text-sm text-gray-500 mb-6">
          AMAYA precursor / control / failure / behavior / event intelligence.
        </p>

        {!isRiskCellsEnabled() ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
            <p className="text-sm text-gray-400 mb-2">Risk Cells module is not yet enabled.</p>
            <p className="text-xs text-gray-300 font-mono">
              Set NEXT_PUBLIC_FEATURE_RISK_CELLS=true to activate.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-blue-200 p-12 text-center">
            <p className="text-sm text-blue-400">Risk Cells module coming soon.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
