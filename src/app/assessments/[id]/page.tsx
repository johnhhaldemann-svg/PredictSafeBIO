import { AppShell } from "@/components/AppShell";

export default async function AssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">Assessment detail</p>
          <h1>{id}</h1>
        </header>
        <section className="panel">
          <p>
            This route is ready for a Supabase-backed immutable assessment detail view. The saved record should include input snapshot,
            output snapshot, signals, audit events, and human-review status.
          </p>
        </section>
      </div>
    </AppShell>
  );
}
