// ---------------------------------------------------------------------------
// Risk assessment context: task category, resources at risk, assessment team.
//
// Small, standard risk-assessment attributes carried by every hazard line in
// the reference workbooks:
//   • Task category — routine vs. non-routine vs. emergency (non-routine work
//     is inherently higher risk and warrants closer review)
//   • Resources at risk — People / Assets / Environment
//   • Assessment team — named participants with expertise and a designated lead,
//     for audit defensibility
//
// Pure types + small helpers.
// ---------------------------------------------------------------------------

export type TaskCategory = "routine" | "non_routine" | "emergency";

export const TASK_CATEGORY_LABELS: Record<TaskCategory, string> = {
  routine: "Routine",
  non_routine: "Non-Routine",
  emergency: "Emergency"
};

/** Non-routine and emergency work carry elevated, less-familiar risk. */
export function isElevatedTaskCategory(category: TaskCategory): boolean {
  return category !== "routine";
}

export type ResourceAtRisk = "people" | "assets" | "environment";

export const RESOURCE_AT_RISK_LABELS: Record<ResourceAtRisk, string> = {
  people: "People",
  assets: "Assets",
  environment: "Environment"
};

export type AssessmentTeamMember = {
  name: string;
  role: string;
  areaOrDepartment?: string | null;
  /** Education, certification, or experience that qualifies them. */
  expertise: string;
  isLeader?: boolean;
};

/** A defensible assessment team has at least one member and a designated leader. */
export function hasTeamLeader(team: AssessmentTeamMember[]): boolean {
  return team.some((member) => member.isLeader);
}

export type TeamReadiness = {
  ready: boolean;
  memberCount: number;
  hasLeader: boolean;
  reasons: string[];
};

/** Assess whether a risk-assessment team is adequately constituted. */
export function assessTeamReadiness(team: AssessmentTeamMember[]): TeamReadiness {
  const reasons: string[] = [];
  if (team.length === 0) reasons.push("No team members assigned.");
  if (!hasTeamLeader(team)) reasons.push("No designated team leader.");
  if (team.some((member) => !member.expertise.trim())) reasons.push("One or more members have no recorded expertise.");

  return {
    ready: reasons.length === 0,
    memberCount: team.length,
    hasLeader: hasTeamLeader(team),
    reasons
  };
}
