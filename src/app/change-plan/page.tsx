import Link from "next/link";
import { ClipboardList, LockKeyhole, PencilLine, PlusCircle } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { changePlanPriorities, changePlanStatuses, gapModuleCards, platformCategories } from "@/lib/platform-outline";
import { listChangePlanItems } from "@/lib/supabase/data";
import {
  createChangePlanItemAction,
  seedDefaultChangePlanItemsAction,
  updateChangePlanItemAction
} from "./actions";

type ChangePlanPageProps = {
  searchParams: Promise<{ message?: string }>;
};

export default async function ChangePlanPage({ searchParams }: ChangePlanPageProps) {
  const [params, plan] = await Promise.all([searchParams, listChangePlanItems()]);
  const plannedCount = plan.items.filter((row) => row.status === "Planned").length;
  const highPriorityCount = plan.items.filter((row) => row.priority === "High").length;
  const persistedCount = plan.items.filter((row) => row.persisted).length;
  const accessTitle = plan.canManage
    ? plan.isFallback
      ? "Owner controls available - seed starter rows"
      : "Owner roadmap controls enabled"
    : "Read-only change plan";
  const accessMessage = plan.canManage
    ? plan.isFallback
      ? "This workspace is showing starter rows. Seed them once to make this roadmap editable."
      : "Owners can create and update roadmap rows for this organization workspace."
    : "Roadmap editing is owner-only. This page shows planned capabilities without changing controlled records.";

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">PredictSafeBIO - Editable Additions & Change Plan</p>
          <h1>Additions & Change Plan</h1>
        </header>

        {params.message ? <p className="form-message">{params.message}</p> : null}

        <section className={`panel access-banner ${plan.canManage ? "access-enabled" : "access-readonly"}`}>
          <div>
            <strong>{accessTitle}</strong>
            <span>
              {accessMessage} {plan.message}
            </span>
          </div>
          {plan.canManage ? <PencilLine size={22} /> : <LockKeyhole size={22} />}
        </section>

        <section className="summary-strip" aria-label="Change plan summary">
          <span>{plan.items.length} roadmap items</span>
          <span>{highPriorityCount} high priority</span>
          <span>{plannedCount} planned</span>
          <span>{persistedCount > 0 ? `${persistedCount} persisted` : "Curated starter rows"}</span>
        </section>

        {plan.canManage ? (
          <section className="panel change-plan-controls" aria-label="Owner Change Plan controls">
            <div className="panel-heading">
              <div>
                <p className="section-label">Owner Controls</p>
                <h2>Create or seed roadmap rows</h2>
              </div>
              <PlusCircle size={22} />
            </div>

            {plan.isFallback ? (
              <form action={seedDefaultChangePlanItemsAction} className="change-plan-seed">
                <div>
                  <strong>Seed curated starter rows</strong>
                  <span>Creates the five screenshot-aligned rows in Supabase for this organization.</span>
                </div>
                <button className="button-primary" type="submit">
                  Seed rows
                </button>
              </form>
            ) : null}

            <form action={createChangePlanItemAction} className="change-plan-form">
              <label>
                Category
                <select name="category" defaultValue="System Reliance">
                  {platformCategories.map((category) => (
                    <option key={category.title} value={category.title}>
                      {category.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                New Capability / Feature
                <input name="feature" placeholder="Example: Evidence API connector" required />
              </label>
              <label>
                Owner
                <input name="owner" defaultValue="Platform Owner" required />
              </label>
              <label>
                Priority
                <select name="priority" defaultValue="Medium">
                  {changePlanPriorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Status
                <select name="status" defaultValue="Planned">
                  {changePlanStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Route
                <input name="href" defaultValue="/change-plan" />
              </label>
              <label>
                Sort
                <input name="sortOrder" type="number" defaultValue={plan.items.length + 1} min={1} />
              </label>
              <label className="wide-field">
                Notes / Requirement Detail
                <textarea name="notes" defaultValue="Roadmap requirement detail pending owner review." required />
              </label>
              <div className="form-actions wide-field">
                <button className="button-primary" type="submit">
                  Add item
                </button>
              </div>
            </form>
          </section>
        ) : null}

        <section className="table-panel change-plan-table" aria-label="Additional modules and capabilities">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>New Capability / Feature</th>
                <th>Owner</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Notes / Requirement Detail</th>
              </tr>
            </thead>
            <tbody>
              {plan.items.map((row) => (
                <tr key={row.id ?? `${row.category}-${row.feature}`}>
                  <td>{row.category}</td>
                  <td>
                    <Link href={row.href}>{row.feature}</Link>
                  </td>
                  <td>{row.owner}</td>
                  <td>{row.priority}</td>
                  <td>{row.status}</td>
                  <td>{row.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {plan.canManage && !plan.isFallback ? (
          <section className="panel" aria-label="Owner roadmap update controls">
            <div className="panel-heading">
              <div>
                <p className="section-label">Owner Edit Queue</p>
                <h2>Update persisted roadmap rows</h2>
              </div>
              <ClipboardList size={22} />
            </div>
            <div className="change-plan-editor-list">
              {plan.items.map((row) => (
                <form action={updateChangePlanItemAction} className="change-plan-edit-row" key={row.id ?? row.feature}>
                  <input name="id" type="hidden" value={row.id ?? ""} />
                  <input name="category" type="hidden" value={row.category} />
                  <input name="feature" type="hidden" value={row.feature} />
                  <div>
                    <strong>{row.feature}</strong>
                    <span>{row.category}</span>
                  </div>
                  <label>
                    Owner
                    <input name="owner" defaultValue={row.owner} />
                  </label>
                  <label>
                    Priority
                    <select name="priority" defaultValue={row.priority}>
                      {changePlanPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Status
                    <select name="status" defaultValue={row.status}>
                      {changePlanStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Route
                    <input name="href" defaultValue={row.href} />
                  </label>
                  <label>
                    Sort
                    <input name="sortOrder" type="number" defaultValue={row.sortOrder} min={1} />
                  </label>
                  <label className="wide-field">
                    Notes / Requirement Detail
                    <textarea name="notes" defaultValue={row.notes} />
                  </label>
                  <div className="form-actions wide-field">
                    <button className="button-secondary" type="submit">
                      Save row
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </section>
        ) : null}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <p className="section-label">Visible Gap Modules</p>
              <h2>Demo-ready capability cards</h2>
            </div>
            <ClipboardList size={22} />
          </div>
          <div className="gap-card-grid">
            {gapModuleCards.map((module) => (
              <Link className="gap-card" href={module.href} key={module.title}>
                <span>{module.category}</span>
                <strong>{module.title}</strong>
                <p>{module.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
