"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import ExposureMap, { type ExposurePathway } from "./ExposureMap";
import { updateExposureStatusAction } from "@/app/exposure-map/actions";

export function ExposureMapWrapper({ pathways }: { pathways: ExposurePathway[] }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  async function handleMarkMitigated(id: string) {
    const fd = new FormData();
    fd.set("id", id);
    fd.set("status", "mitigated");
    await updateExposureStatusAction(fd);
    startTransition(() => router.refresh());
  }

  return (
    <ExposureMap
      pathways={pathways}
      onAddPathway={() => router.push("/exposure-map/new")}
      onExport={() => { /* TODO: wire CSV export */ }}
      onMarkMitigated={handleMarkMitigated}
      onOpenPathway={(id) => router.push(`/exposure-map/${id}`)}
      onOpenHazard={(hazardRef) => router.push(`/hazards/${hazardRef}`)}
    />
  );
}
