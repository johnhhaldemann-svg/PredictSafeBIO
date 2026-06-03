/**
 * RoleAccessBanner — Server component.
 * Shown on pages that have role-specific restrictions.
 * Pass the auth summary and the minimum role required to take action.
 */
import { Lock, ShieldCheck } from "lucide-react";
import { getRoleLabel, getRoleBadgeClass, type WorkspaceRole } from "@/lib/role-permissions";

type Props = {
  currentRole: string | null | undefined;
  requiredRole: WorkspaceRole;
  /** What action is blocked for the current role */
  blockedMessage?: string;
  /** What the current role CAN do on this page */
  allowedMessage?: string;
};

const roleOrder: WorkspaceRole[] = ["patient", "provider", "admin", "superadmin"];

function meetsRequirement(current: string | null | undefined, required: WorkspaceRole): boolean {
  let cur: WorkspaceRole;
  if (current === "superadmin") cur = "superadmin";
  else if (current === "admin" || current === "owner" || current === "company_admin") cur = "admin";
  else if (current === "provider" || current === "project_admin" || current === "safety_manager") cur = "provider";
  else cur = "patient";
  return roleOrder.indexOf(cur) >= roleOrder.indexOf(required);
}

export function RoleAccessBanner({ currentRole, requiredRole, blockedMessage, allowedMessage }: Props) {
  const hasAccess = meetsRequirement(currentRole, requiredRole);
  const currentLabel = getRoleLabel(currentRole);
  const requiredLabel = getRoleLabel(requiredRole);
  const badgeClass = getRoleBadgeClass(currentRole);

  if (hasAccess) {
    return allowedMessage ? (
      <div className="panel inline-action-panel" style={{ padding: "0.75rem 1rem" }}>
        <div>
          <span className={badgeClass} style={{ fontWeight: 600, fontSize: "0.82em" }}>{currentLabel}</span>
          {" — "}{allowedMessage}
        </div>
        <ShieldCheck size={18} />
      </div>
    ) : null;
  }

  return (
    <div className="panel access-banner access-readonly" role="alert" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <Lock size={18} style={{ flexShrink: 0 }} />
      <div>
        <strong>
          <span className={badgeClass}>{currentLabel}</span> access
        </strong>
        {" — "}
        {blockedMessage ?? `This action requires ${requiredLabel} access.`}
        <span className="muted" style={{ marginLeft: "0.5rem", fontSize: "0.85em" }}>
          Contact your workspace admin to have your role upgraded.
        </span>
      </div>
    </div>
  );
}
