export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { listQualifiedPersons, listOrgMembers } from "@/lib/supabase/qualified-person-service";
import QualifiedPersonsView from "./QualifiedPersonsView";

export const metadata: Metadata = { title: "Qualified Persons – PredictSafe" };

type Props = { searchParams: Promise<{ message?: string; success?: string }> };

export default async function QualifiedPersonsPage({ searchParams }: Props) {
  const params = await searchParams;
  const [people, members] = await Promise.all([
    listQualifiedPersons().catch(() => []),
    listOrgMembers().catch(() => []),
  ]);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">&#9679; Plan &middot; Governance</p>
            <h1>Qualified Person Registry</h1>
            <p className="muted">
              Who may approve restricted decisions — register changes, CAPA closure, chemical approvals,
              and manifests. Restricted actions are blocked unless the user is listed here and current.
            </p>
          </div>
          <a className="button-secondary" href="/plan/risk-register">← Risk Register</a>
        </header>

        {params.success && (
          <div className="verification-pass-box"><span>✓ {params.success}</span></div>
        )}

        <QualifiedPersonsView
          people={people}
          members={members}
          message={params.message}
        />
      </div>
    </AppShell>
  );
}
