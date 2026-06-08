export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseServiceConfigured } from "@/lib/supabase/env";

/**
 * /providers/[id] — Public provider profile page.
 * Only renders if review_status = 'approved' AND is_public = true.
 * 404s for pending/rejected/private profiles — no information leakage.
 */

type Props = { params: Promise<{ id: string }> };

export default async function ProviderProfilePage({ params }: Props) {
  const { id } = await params;
  if (!isSupabaseServiceConfigured()) notFound();
  const admin = getSupabaseAdminClient();


  const { data } = await (admin as any)
    .from("provider_profiles")
    .select(`
      id, specialty, npi_number, credentials, accepting_patients,
      license_number, license_state, npi_verified, npi_verified_at,
      created_at,
      profiles!provider_profiles_user_id_fkey ( full_name ),
      organizations ( name )
    `)
    .eq("id", id)
    .eq("review_status", "approved")
    .eq("is_public", true)
    .eq("is_active", true)
    .maybeSingle();

  if (!data) notFound();


  const p = data as any;
  const provider = {
    id:                p.id as string,
    specialty:         p.specialty as string,
    npi_number:        p.npi_number as string | null,
    credentials:       (p.credentials as string[]) ?? [],
    accepting_patients: p.accepting_patients as boolean,
    license_number:    p.license_number as string | null,
    license_state:     p.license_state as string | null,
    npi_verified:      p.npi_verified as boolean,
    npi_verified_at:   p.npi_verified_at as string | null,
    created_at:        p.created_at as string,
    full_name:         p.profiles?.full_name as string | null ?? "Provider",
    org_name:          p.organizations?.name as string | null ?? null,
  };

  return (
    <AppShell>
      <div className="page-stack">
        <header className="page-header">
          <div className="page-header-left">
            <p className="section-label">Provider Directory</p>
            <h1>{provider.full_name}</h1>
            <p className="muted">{provider.specialty}{provider.org_name ? ` · ${provider.org_name}` : ""}</p>
          </div>
          <Link href="/providers" className="button-secondary">← Directory</Link>
        </header>

        {/* Status badges */}
        <div className="form-action-row">
          {provider.accepting_patients ? (
            <span className="status-current">✓ Available for consultation</span>
          ) : (
            <span className="status-needs-review">Not currently available</span>
          )}
          {provider.npi_verified && (
            <span className="status-current">
              <CheckCircle2 size={13} className="inline-icon" />
              NPI verified
              {provider.npi_verified_at && ` · ${new Date(provider.npi_verified_at).toLocaleDateString()}`}
            </span>
          )}
        </div>

        {/* Credentials */}
        {provider.credentials.length > 0 && (
          <section className="panel">
            <div className="panel-heading">
              <div><p className="section-label">Credentials</p><h2>Qualifications on file</h2></div>
            </div>
            <div className="command-center-link-strip">
              {provider.credentials.map((c: string) => (
                <span key={c} className="status-current">{c}</span>
              ))}
            </div>
          </section>
        )}

        {/* Provider details */}
        <section className="panel">
          <div className="panel-heading">
            <div><p className="section-label">Provider details</p><h2>License &amp; registration</h2></div>
            <Stethoscope size={22} />
          </div>
          <div className="verification-status-grid">
            {provider.npi_number && (
              <article><span>NPI Number</span><strong>{provider.npi_number}</strong></article>
            )}
            {provider.license_state && (
              <article><span>License State</span><strong>{provider.license_state}</strong></article>
            )}
            {provider.license_number && (
              <article><span>License Number</span><strong>{provider.license_number}</strong></article>
            )}
            {provider.org_name && (
              <article><span>Organization</span><strong>{provider.org_name}</strong></article>
            )}
            <article>
              <span>Listed since</span>
              <strong>{new Date(provider.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</strong>
            </article>
          </div>
        </section>

        {/* Verified notice */}
        <div className="ai-context-bar ai-context-bar--success">
          <ShieldCheck size={15} />
          <span>
            <strong>Verified profile.</strong>{" "}
            This provider has been reviewed by the PredictSafeBIO moderation team.
            NPI credentials checked against the NPPES National Provider Registry.
          </span>
        </div>

        {/* Footer nav */}
        <div className="command-center-link-strip">
          <Link href="/providers" className="button-secondary">← Back to directory</Link>
          <Link href="/providers/new" className="button-secondary">Add your profile</Link>
        </div>
      </div>
    </AppShell>
  );
}
