export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * /providers/[id] — Public provider profile page.
 * Only renders if review_status = 'approved' AND is_public = true.
 * 404s for pending/rejected/private profiles — no information leakage.
 */

type Props = { params: Promise<{ id: string }> };

export default async function ProviderProfilePage({ params }: Props) {
  const { id } = await params;
  const admin = getSupabaseAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      <div className="page-stack" style={{ maxWidth: 680 }}>
        <Link href="/providers" className="text-link"
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.85rem" }}>
          <ArrowLeft size={14} /> Provider directory
        </Link>

        <section className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface-2, #f1f5f9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Stethoscope size={20} style={{ color: "#2563eb" }} />
                </div>
                <div>
                  <h1 style={{ margin: 0, fontSize: "1.4rem" }}>{provider.full_name}</h1>
                  <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>{provider.specialty}</p>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              {provider.accepting_patients ? (
                <span className="status-chip status-current">✓ Accepting patients</span>
              ) : (
                <span className="status-chip status-unknown">Not accepting patients</span>
              )}
              {provider.npi_verified && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "#16a34a" }}>
                  <CheckCircle2 size={13} />
                  NPI verified
                  {provider.npi_verified_at && (
                    <span className="muted"> · {new Date(provider.npi_verified_at).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {provider.credentials.length > 0 && (
            <div style={{ marginTop: "1.25rem" }}>
              <p className="section-label" style={{ marginBottom: "0.4rem" }}>Credentials</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {provider.credentials.map((c: string) => (
                  <span key={c} className="status-chip status-current" style={{ fontSize: "0.78rem" }}>{c}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ marginTop: "1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            {provider.npi_number && (
              <div>
                <p className="section-label" style={{ marginBottom: 2 }}>NPI Number</p>
                <p style={{ fontFamily: "monospace", fontSize: "0.9rem", margin: 0 }}>{provider.npi_number}</p>
              </div>
            )}
            {provider.license_state && (
              <div>
                <p className="section-label" style={{ marginBottom: 2 }}>License State</p>
                <p style={{ margin: 0 }}>{provider.license_state}</p>
              </div>
            )}
            {provider.license_number && (
              <div>
                <p className="section-label" style={{ marginBottom: 2 }}>License Number</p>
                <p style={{ fontFamily: "monospace", fontSize: "0.9rem", margin: 0 }}>{provider.license_number}</p>
              </div>
            )}
            {provider.org_name && (
              <div>
                <p className="section-label" style={{ marginBottom: 2 }}>Organization</p>
                <p style={{ margin: 0 }}>{provider.org_name}</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "var(--surface-2, #f8fafc)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={14} style={{ color: "#16a34a" }} />
              <strong style={{ fontSize: "0.83rem" }}>Verified profile</strong>
            </div>
            <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>
              This provider profile has been reviewed and verified by the PredictSafeBIO moderation team.
              NPI credentials were checked against the NPPES National Provider Registry.
              Profile listed since {new Date(provider.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
            </p>
          </div>
        </section>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link href="/providers" className="button-secondary">← Back to directory</Link>
          <Link href="/providers/new" className="button-secondary">Add your profile</Link>
        </div>
      </div>
    </AppShell>
  );
}
