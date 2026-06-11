export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, PlusCircle, Search, Briefcase, ShieldCheck } from "lucide-react";

export const metadata: Metadata = { title: "Provider Directory – PredictSafe" };
import { AppShell } from "@/components/AppShell";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";

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

function filterProviders(providers: Provider[], filters: { specialty?: string; q?: string }) {
  const query = filters.q?.trim().toLowerCase();
  return providers.filter((provider) => {
    if (filters.specialty && provider.specialty !== filters.specialty) return false;
    if (!query) return true;
    return (
      provider.full_name.toLowerCase().includes(query) ||
      provider.specialty.toLowerCase().includes(query) ||
      provider.credentials.some((credential) => credential.toLowerCase().includes(query))
    );
  });
}

async function listApprovedProviders(filters: { specialty?: string; q?: string }): Promise<Provider[]> {
  if (!isSupabaseServiceConfigured()) return [];
  const admin = getSupabaseAdminClient();

  const query = (admin as any)
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

  if (providers.length === 0) providers = DEMO_PROVIDERS;
  return filterProviders(providers, filters);
}

async function getSpecialties(): Promise<string[]> {
  if (!isSupabaseServiceConfigured()) return DEMO_PROVIDERS.map((p) => p.specialty).filter((v, i, a) => a.indexOf(v) === i).sort();
  const admin = getSupabaseAdminClient();

  const { data } = await (admin as any)
    .from("provider_profiles")
    .select("specialty")
    .eq("review_status", "approved")
    .eq("is_public", true);

  const all = ((data ?? []) as any[]).map((p: any) => p.specialty as string);
  const source = all.length > 0 ? all : DEMO_PROVIDERS.map((provider) => provider.specialty);
  return [...new Set(source)].sort();
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
          <div className="page-header-left">
            <p className="section-label">Assess · Personnel Qualification</p>
            <h1>Provider Directory</h1>
            <p className="muted">
              Credentialed biosafety, EHS, and occupational-health experts (CIH, CSP, CBSP, and more).
              Documents qualified coverage for auditors.
            </p>
          </div>
          <Link className="button-secondary" href="/plan/qualified-persons">Qualified Persons →</Link>
        </header>

        {/* Why this matters — compliance purpose */}
        <section className="panel inline-action-panel">
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

        <div className="command-center-link-strip">
          <Link href="/providers/new" className="button-primary">
            <PlusCircle size={14} className="icon-mr" /> Add your profile
          </Link>
          <span className="muted">{providers.length} provider{providers.length !== 1 ? "s" : ""} listed</span>
        </div>

        {/* Filters */}
        <form className="provider-filter-form">
          <label>
            <span><Search size={12} className="icon-mr" />Search</span>
            <input name="q" defaultValue={sp.q ?? ""} placeholder="Name, specialty, credential…" />
          </label>
          <label>
            Specialty
            <select name="specialty" defaultValue={sp.specialty ?? ""}>
              <option value="">All specialties</option>
              {specialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <button className="button-secondary" type="submit">Filter</button>
          {(sp.specialty || sp.q) && (
            <Link href="/providers" className="button-secondary">Clear</Link>
          )}
        </form>

        {providers.length === 0 ? (
          <section className="panel">
            <div className="empty-state-card">
              <Briefcase size={32} className="muted" />
              <p className="empty-state-title">No providers found</p>
              <p className="muted">
                {sp.specialty || sp.q ? "Try adjusting your filters." : "Be the first to add your profile."}
              </p>
              <Link href="/providers/new" className="button-primary">Add your profile</Link>
            </div>
          </section>
        ) : (
          <div className="command-card-grid">
            {providers.map(p => (
              <Link
                key={p.id}
                href={p.id.startsWith("demo-") ? "/providers" : `/providers/${p.id}`}
                className="provider-card-link"
              >
                <article className="command-card">
                  <div className="provider-card-header">
                    <div>
                      <strong>{p.full_name}</strong>
                      <p className="muted">{p.specialty}</p>
                    </div>
                    {p.npi_verified && (
                      <CheckCircle2 size={16} className="provider-verified-icon" aria-label="Verified profile" />
                    )}
                  </div>

                  {p.credentials.length > 0 && (
                    <div className="provider-credentials">
                      {p.credentials.map((c: string) => (
                        <span key={c} className="status-chip status-current">{c}</span>
                      ))}
                    </div>
                  )}

                  <div className="provider-card-meta">
                    {p.license_state && <span className="muted">📍 {p.license_state}</span>}
                    <span className={p.accepting_patients ? "status-current" : "muted"}>
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
