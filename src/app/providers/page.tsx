export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, PlusCircle, Search, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * /providers — Public provider directory.
 * Shows all approved (is_public = true) provider profiles.
 * Filterable by specialty. No auth required to browse.
 */

type Props = {
  searchParams: Promise<{ specialty?: string; q?: string }>;
};

async function listApprovedProviders(filters: { specialty?: string; q?: string }) {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any)
    .from("provider_profiles")
    .select(`
      id, specialty, npi_number, credentials, accepting_patients,
      license_state, npi_verified,
      profiles!provider_profiles_user_id_fkey ( full_name )
    `)
    .eq("review_status", "approved")
    .eq("is_public", true)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (filters.specialty) query = query.eq("specialty", filters.specialty);

  const { data } = await query;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let providers = ((data ?? []) as any[]).map((p: any) => ({
    id:                p.id as string,
    specialty:         p.specialty as string,
    npi_number:        p.npi_number as string | null,
    credentials:       (p.credentials as string[]) ?? [],
    accepting_patients: p.accepting_patients as boolean,
    license_state:     p.license_state as string | null,
    npi_verified:      p.npi_verified as boolean,
    full_name:         p.profiles?.full_name as string | null ?? "Provider",
  }));

  // Client-side name search
  if (filters.q) {
    const q = filters.q.toLowerCase();
    providers = providers.filter(p =>
      p.full_name.toLowerCase().includes(q) ||
      p.specialty.toLowerCase().includes(q) ||
      p.credentials.some((c: string) => c.toLowerCase().includes(q))
    );
  }

  return providers;
}

async function getSpecialties(): Promise<string[]> {
  const admin = getSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("specialty")
    .eq("review_status", "approved")
    .eq("is_public", true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const all = ((data ?? []) as any[]).map((p: any) => p.specialty as string);
  return [...new Set(all)].sort();
}

export default async function ProvidersDirectoryPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [providers, specialties] = await Promise.all([
    listApprovedProviders({ specialty: sp.specialty, q: sp.q }),
    getSpecialties(),
  ]);

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <p className="section-label">PredictSafeBIO</p>
          <h1>Provider Directory</h1>
          <p className="muted">
            Browse verified biosafety and occupational health providers.
            All profiles are NPI-verified and reviewed by our moderation team.
          </p>
        </header>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/providers/new" className="button-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem" }}>
            <PlusCircle size={14} /> Add your profile
          </Link>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {providers.length} provider{providers.length !== 1 ? "s" : ""} listed
          </span>
        </div>

        {/* Filters */}
        <form style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.83rem", flex: "1 1 200px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Search size={12} /> Search</span>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, specialty, credential…" />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.83rem", flex: "1 1 180px" }}>
            Specialty
            <select name="specialty" defaultValue={sp.specialty ?? ""}>
              <option value="">All specialties</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button className="button-secondary" type="submit" style={{ fontSize: "0.83rem" }}>Filter</button>
          {(sp.specialty || sp.q) && (
            <Link href="/providers" className="button-secondary" style={{ fontSize: "0.83rem" }}>Clear</Link>
          )}
        </form>

        {providers.length === 0 ? (
          <section className="panel" style={{ textAlign: "center", padding: "3rem" }}>
            <Stethoscope size={32} style={{ color: "var(--muted)", margin: "0 auto 1rem" }} />
            <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No providers found</p>
            <p className="muted" style={{ fontSize: "0.85rem" }}>
              {sp.specialty || sp.q ? "Try adjusting your filters." : "Be the first to add your profile."}
            </p>
            <Link href="/providers/new" className="button-primary" style={{ display: "inline-flex", marginTop: "1rem" }}>
              Add your profile
            </Link>
          </section>
        ) : (
          <div className="command-card-grid">
            {providers.map(p => (
              <Link key={p.id} href={`/providers/${p.id}`} style={{ textDecoration: "none" }}>
                <article className="command-card" style={{ cursor: "pointer", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>{p.full_name}</strong>
                      <p className="muted" style={{ fontSize: "0.8rem", margin: "2px 0" }}>{p.specialty}</p>
                    </div>
                    {p.npi_verified && (
                      <span title="NPI verified" style={{ flexShrink: 0 }}>
                        <CheckCircle2 size={16} style={{ color: "#16a34a" }} />
                      </span>
                    )}
                  </div>

                  {p.credentials.length > 0 && (
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                      {p.credentials.map((c: string) => (
                        <span key={c} className="status-chip status-current" style={{ fontSize: "0.68rem" }}>{c}</span>
                      ))}
                    </div>
                  )}

                  <div style={{ display: "flex", gap: "1rem", marginTop: 8, fontSize: "0.78rem" }}>
                    {p.license_state && (
                      <span className="muted">📍 {p.license_state}</span>
                    )}
                    <span className={p.accepting_patients ? "muted" : "muted"} style={{ color: p.accepting_patients ? "#16a34a" : "#6b7280" }}>
                      {p.accepting_patients ? "✓ Accepting patients" : "Not accepting"}
                    </span>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
