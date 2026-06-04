export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, PlusCircle, Search, Briefcase, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Provider Directory – PredictSafeBIO" };
import { AppShell } from "@/components/AppShell";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * /providers — Provider Directory.
 * A searchable record of credentialed biosafety / EHS / occupational-health
 * experts. Supports audit readiness (demonstrating qualified coverage to CDC /
 * USDA / EPA), fast incident-response access to specialists, personnel
 * qualification tracking, and credential-gap identification.
 * Shows all approved (is_public = true) profiles. No auth required to browse.
 */

type Provider = {
  id: string;
  specialty: string;
  npi_number: string | null;
  credentials: string[];
  accepting_patients: boolean;
  license_state: string | null;
  npi_verified: boolean;
  full_name: string;
};

/** Sample records shown when the live directory is empty (unauthenticated demo view). */
const DEMO_PROVIDERS: Provider[] = [
  {
    id: "demo-1",
    full_name: "Dr. Sarah Chen",
    specialty: "Occupational Health & Biosafety",
    credentials: ["MD", "MPH", "CIH"],
    license_state: "CA",
    accepting_patients: true,
    npi_number: null,
    npi_verified: true,
  },
  {
    id: "demo-2",
    full_name: "Dr. Marcus Webb",
    specialty: "Industrial Hygiene",
    credentials: ["PhD", "CIH", "CSP"],
    license_state: "MA",
    accepting_patients: true,
    npi_number: null,
    npi_verified: true,
  },
  {
    id: "demo-3",
    full_name: "Dr. Priya Kapoor",
    specialty: "Environmental Health & Safety",
    credentials: ["DrPH", "CHMM"],
    license_state: "TX",
    accepting_patients: false,
    npi_number: null,
    npi_verified: false,
  },
];

type Props = {
  searchParams: Promise<{ specialty?: string; q?: string }>;
};

async function listApprovedProviders(filters: { specialty?: string; q?: string }): Promise<Provider[]> {
  const admin = getSupabaseAdminClient();
   
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

   
  let providers: Provider[] = ((data ?? []) as any[]).map((p: any) => ({
    id:                p.id as string,
    specialty:         p.specialty as string,
    npi_number:        p.npi_number as string | null,
    credentials:       (p.credentials as string[]) ?? [],
    accepting_patients: p.accepting_patients as boolean,
    license_state:     p.license_state as string | null,
    npi_verified:      p.npi_verified as boolean,
    full_name:         p.profiles?.full_name as string | null ?? "Provider",
  }));

  // Fall back to demo records when the live directory is empty and no filter is active
  if (providers.length === 0 && !filters.specialty && !filters.q) {
    return DEMO_PROVIDERS;
  }

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
   
  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("specialty")
    .eq("review_status", "approved")
    .eq("is_public", true);
   
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
          <p className="section-label">Personnel qualification</p>
          <h1>Provider Directory</h1>
          <p className="muted">
            A searchable record of credentialed biosafety, EHS, and occupational-health experts
            (CIH, CSP, CBSP, and more). Documents qualified coverage for auditors, and puts the
            right specialist one click away during a spill, exposure, or incident. All profiles are
            reviewed by our moderation team.
          </p>
        </header>

        {/* Why this matters — compliance purpose */}
        <section className="panel inline-action-panel" style={{ alignItems: "flex-start" }}>
          <div>
            <p className="section-label">Why this directory matters</p>
            <ul className="provider-purpose-list">
              <li><strong>Audit readiness</strong> — show CDC / USDA / EPA reviewers you have qualified biosafety professionals on record.</li>
              <li><strong>Incident response</strong> — reach a verified specialist fast during a spill or exposure event.</li>
              <li><strong>Qualification tracking</strong> — document that the people making BSL-2/BSL-3 and IBC decisions hold the credentials to make them.</li>
              <li><strong>Gap identification</strong> — see where you&apos;re missing coverage (e.g. a CIH) before an auditor does.</li>
            </ul>
          </div>
          <ShieldCheck size={22} aria-hidden="true" />
        </section>

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
            <Briefcase size={32} style={{ color: "var(--muted)", margin: "0 auto 1rem" }} />
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
              <Link key={p.id} href={p.id.startsWith("demo-") ? "/providers" : `/providers/${p.id}`} style={{ textDecoration: "none" }}>
                <article className="command-card" style={{ cursor: "pointer", height: "100%" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div>
                      <strong style={{ fontSize: "0.95rem" }}>{p.full_name}</strong>
                      <p className="muted" style={{ fontSize: "0.8rem", margin: "2px 0" }}>{p.specialty}</p>
                    </div>
                    {p.npi_verified && (
                      <span title="Verified profile" style={{ flexShrink: 0 }}>
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
                    <span className="muted" style={{ color: p.accepting_patients ? "#16a34a" : "#6b7280" }}>
                      {p.accepting_patients ? "✓ Available for consultation" : "Not currently available"}
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
