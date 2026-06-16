export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import {
  listChemicals,
  hazardClassLabels,
  type ChemicalRecord,
  type HazardClass,
} from "@/lib/supabase/chemical-service";
import { getFoundationAdminAccessSummary } from "@/lib/supabase/data";
import { getAuthSummary } from "@/lib/supabase/account-service";
import ChemicalSds, { type ViewChem, type GhsKey } from "@/components/ChemicalSds";

export const metadata: Metadata = { title: "Chemical & SDS – PredictSafe" };

/* ─── Segregate-from lookup (display only) ──────────────────────────────── */

const SEGREGATE_FROM: Partial<Record<HazardClass, string[]>> = {
  flammable:       ["Oxidizers", "Acids"],
  corrosive:       ["Bases", "Flammables", "Azides / cyanides"],
  toxic:           ["Acids", "Metals / plumbing", "Heavy metals (Cu, Pb)"],
  oxidizer:        ["Flammables", "Organics", "Reducing agents"],
  compressed_gas:  ["Heat sources"],
  explosive:       ["Heat", "Shock", "Friction", "All other chemicals"],
  environmental:   [],
  health_hazard:   [],
  irritant:        [],
  other:           [],
};

/* ─── Mapping ───────────────────────────────────────────────────────────── */

function mapRecord(c: ChemicalRecord): ViewChem {
  return {
    id:             c.id,
    name:           c.chemicalName,
    cas:            c.casNumber ?? null,
    location:       c.storageLocation ?? null,
    quantity:       c.quantity ?? null,
    hazardClass:    (c.hazardClass ?? null) as GhsKey | null,
    restricted:     c.restricted ?? false,
    sdsPresent:     c.sdsPresent,
    expirationDate: c.expirationDate ?? null,
    expiringSoon:   c.expiringSoon,
    expired:        c.expired,
    storageGroup:   c.storageGroup ?? null,
    segregateFrom:  SEGREGATE_FROM[c.hazardClass as HazardClass] ?? [],
  };
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

function safeSettle<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

export default async function ChemicalInventoryPage() {
  const [chemicalsResult, adminAccess, auth] = await Promise.all([
    safeSettle(listChemicals(), null),
    safeSettle(getFoundationAdminAccessSummary(), {
      configured: false, signedIn: false, isOwner: false, message: "",
    }),
    safeSettle(getAuthSummary(), {
      configured: false, signedIn: false, needsOnboarding: false,
    }),
  ]);

  const chemicals = chemicalsResult ? chemicalsResult.map(mapRecord) : undefined;

  return (
    <ChemicalSds
      chemicals={chemicals}
      auth={{
        isSignedIn: adminAccess.signedIn,
        isOwner:    adminAccess.isOwner,
        userEmail:  auth.userEmail ?? null,
      }}
    />
  );
}
