"use client";

import { useRouter } from "next/navigation";
import HazardRegister, { type Hazard } from "./HazardRegister";

export function HazardRegisterWrapper({ hazards }: { hazards: Hazard[] }) {
  const router = useRouter();
  return (
    <HazardRegister
      hazards={hazards}
      onAddHazard={() => router.push("/hazards/new")}
      onExport={() => { /* TODO: wire CSV export */ }}
      onOpenHazard={(id) => router.push(`/hazards/${id}`)}
    />
  );
}
