"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

type Org = { id: string; name: string };

/**
 * Top-bar customer picker. Selecting an org filters the Command Center to that
 * single tenant (?org=…); "All Tenants" returns to the cross-tenant view.
 */
export function TenantSwitcher({ orgs }: { orgs: Org[] }) {
  const router = useRouter();
  const current = useSearchParams().get("org") ?? "";

  return (
    <div className="psb-org-switch">
      <span className="lbl psb-mono">ORG</span>
      <select
        key={current}
        aria-label="Filter to a customer"
        defaultValue={current}
        onChange={(e) => {
          const id = e.target.value;
          router.push(id ? `/admin/dashboard?org=${id}` : "/admin/dashboard");
        }}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--cyan)",
          font: "inherit",
          cursor: "pointer",
          padding: 0,
          maxWidth: 160,
        }}
      >
        <option value="">All Tenants ({orgs.length})</option>
        {orgs.map((o) => (
          <option key={o.id} value={o.id}>{o.name}</option>
        ))}
      </select>
      <ChevronDown size={12} aria-hidden="true" />
    </div>
  );
}
