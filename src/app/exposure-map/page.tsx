export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import {
  listExposures,
  listLabsForExposure,
  type ExposureRoute as ServiceRoute,
  type ExposureStatus,
} from "@/lib/supabase/exposure-service";
import { listHazards } from "@/lib/supabase/hazard-service";
import { ExposureMapWrapper } from "@/components/ExposureMapWrapper";
import type { ExposurePathway, ExposureRoute, Frequency, PathwayStatus } from "@/components/ExposureMap";

export const metadata: Metadata = { title: "Exposure Map – PredictSafe" };

/* Map service route (6 values) → component route (5 values) */
function mapRoute(r: ServiceRoute): ExposureRoute {
  if (r === "injection")  return "injection_sharps";
  if (r === "skin")       return "skin_dermal";
  if (r === "mucosal")    return "absorption";
  if (r === "other")      return "absorption";
  if (r === "inhalation") return "inhalation";
  return "ingestion";
}

/* Map service status (3 values) → component status (3 values) */
function mapStatus(s: ExposureStatus): PathwayStatus {
  if (s === "retired") return "mitigated";
  return s as PathwayStatus;
}

export default async function ExposureMapPage() {
  const [exposures, labs, hazards] = await Promise.all([
    listExposures().catch(() => []),
    listLabsForExposure().catch(() => []),
    listHazards().catch(() => []),
  ]);

  const labName    = new Map(labs.map((l) => [l.id, l.name]));
  const hazardName = new Map(hazards.map((h) => [h.id, h.name]));

  const pathways: ExposurePathway[] = exposures.map((e) => ({
    id:               e.id,
    role:             e.personRole ?? "Personnel",
    task:             e.material   ?? "Material",
    location:         e.labId && labName.get(e.labId) ? labName.get(e.labId)! : "Unassigned location",
    route:            mapRoute(e.exposureRoute),
    frequency:        e.frequency as Frequency,
    status:           mapStatus(e.status),
    hazardName:       e.hazardId && hazardName.get(e.hazardId) ? hazardName.get(e.hazardId)! : "Unknown hazard",
    hazardRef:        e.hazardId ?? undefined,
    containmentLevel: undefined,
    controlNote:      e.notes ?? "No notes recorded.",
    controlsVerified: e.status === "mitigated",
    owner:            null,
    nextReview:       null,
  }));

  return <ExposureMapWrapper pathways={pathways} />;
}
