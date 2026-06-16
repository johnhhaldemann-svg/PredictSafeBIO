export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { listChangePlanItems } from "@/lib/supabase/data";
import { listMocRecords } from "@/lib/supabase/moc-service";
import ChangeManagementTabs, {
  type ViewChangePlanItem,
  type ViewMocItem,
  type CMStage,
  type CMPriority,
} from "@/components/ChangeManagementTabs";

export const metadata: Metadata = { title: "Change Management – PredictSafe" };

/* ─── Data mapping ─────────────────────────────────────────────────────────── */

const STATUS_TO_STAGE: Record<string, CMStage> = {
  "planned":         "planned",
  "under review":    "review",
  "in review":       "review",
  "implementing":    "implementing",
  "in progress":     "implementing",
  "verifying":       "verifying",
  "done":            "done",
  "archived":        "done",
  "complete":        "done",
};

const STAGE_PROGRESS: Record<CMStage, number> = {
  planned: 5, review: 25, implementing: 55, verifying: 80, done: 100,
};

function toPriority(p: string | undefined): CMPriority {
  const lower = (p ?? "").toLowerCase();
  if (lower === "high") return "high";
  if (lower === "low")  return "low";
  return "medium";
}

function toStage(s: string | undefined): CMStage {
  return STATUS_TO_STAGE[(s ?? "").toLowerCase()] ?? "planned";
}

/* ─── Page ─────────────────────────────────────────────────────────────────── */

export default async function ChangeManagementPage() {
  const [plan, mocRecords] = await Promise.all([
    listChangePlanItems().catch(() => ({
      items: [], canManage: false, signedIn: false, isFallback: true, message: "", persisted: false,
    })),
    listMocRecords().catch(() => []),
  ]);

  const planItems: ViewChangePlanItem[] = plan.items
    .filter((r) => r.status !== "Archived")
    .map((r, i) => {
      const stage = toStage(r.status);
      return {
        id: r.id ?? String(i),
        title: r.feature,
        priority: toPriority(r.priority),
        stage,
        affects: r.category ? [r.category] : [],
        owner: r.owner ?? "",
        progress: STAGE_PROGRESS[stage],
      };
    });

  const mocItems: ViewMocItem[] = mocRecords.map((r) => ({
    id: r.id,
    type: r.changeType ?? "other",
    title: r.changeDescription ?? "Change record",
    affects: r.affectedPrograms,
    revalidation: r.routingRequired.map((role) => `Route to ${role}`),
    status: r.status,
  }));

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Plan · Change Management</p>
            <h1>Change Management</h1>
            <p className="muted">
              Use the <strong>Change Plan</strong> for strategic improvements; use{" "}
              <strong>Management of Change</strong> when processes, materials, or equipment change
              and controls must be revalidated.
            </p>
          </div>
        </header>

        <ChangeManagementTabs planItems={planItems} mocItems={mocItems} />
      </div>
    </AppShell>
  );
}
