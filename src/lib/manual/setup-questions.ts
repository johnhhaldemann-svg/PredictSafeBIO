// Manual v1.1 — 26-question Client Setup Questionnaire (Appendix A / §4).
// Each question maps (when answered yes / non-empty) to program_catalog.program_name
// values that the applicability engine should enable.

export type SetupQuestion = {
  number: number;
  domain: string;
  text: string;
  /** kind: boolean = yes/no; text = free text (non-empty, non-"no" counts as applicable) */
  kind: "boolean" | "text";
  triggers: string[]; // exact program_catalog.program_name values
};

export const SETUP_QUESTIONS: SetupQuestion[] = [
  { number: 1, domain: "Company & Facility", text: "Do you have laboratories?", kind: "boolean", triggers: ["Chemical Hygiene"] },
  { number: 2, domain: "Chemicals", text: "Do you use chemicals? Do you use laboratory chemicals?", kind: "boolean", triggers: ["HazCom / Chemical Management", "Chemical Hygiene", "Chemical Approval", "Aging / Unstable Chemicals"] },
  { number: 3, domain: "Biological Materials", text: "Do you use biological materials?", kind: "boolean", triggers: ["Biosafety", "Biological Material Review", "Biohazard / Sharps Waste"] },
  { number: 4, domain: "Biological Materials", text: "Do you use human blood, tissue, patient samples, or other potentially infectious material?", kind: "boolean", triggers: ["Bloodborne Pathogens"] },
  { number: 5, domain: "Biological Materials", text: "Do you handle unknown, uncharacterized, or unscreened biological material that must be treated as potentially infectious?", kind: "boolean", triggers: ["Biosafety", "Bloodborne Pathogens"] },
  { number: 6, domain: "Biological Materials", text: "Do you use recombinant or synthetic nucleic acids, viral vectors, genetically modified organisms, animals, or plants?", kind: "boolean", triggers: ["IBC / Recombinant or Synthetic Nucleic Acids"] },
  { number: 7, domain: "Biological Materials", text: "What BSL level is currently assigned to each lab/process, and are any site-defined enhanced BSL-2/BSL-2+ controls used?", kind: "text", triggers: ["Biosafety", "BSC Register"] },
  { number: 8, domain: "High-Risk Exposures", text: "Do you use lasers? If yes, what class and are beams enclosed or open?", kind: "boolean", triggers: ["Laser Safety"] },
  { number: 9, domain: "High-Risk Exposures", text: "Do you use radioactive material, isotopes, x-ray/radiation-generating equipment, or radioactive markers?", kind: "boolean", triggers: ["Radiation Safety"] },
  { number: 10, domain: "Manufacturing & Operations", text: "Do you have manufacturing, production, assembly, or pilot operations (equipment, automation, or production lines)?", kind: "boolean", triggers: ["Equipment & Engineering Controls", "Warehouse / Material Handling"] },
  { number: 11, domain: "Manufacturing & Operations", text: "Do you operate cleanrooms, sterile areas, or controlled environments?", kind: "boolean", triggers: ["Cleanroom / Controlled Environment"] },
  { number: 12, domain: "Waste & Environmental", text: "Do you generate hazardous, biohazard, sharps, pharmaceutical, universal, or radioactive waste?", kind: "boolean", triggers: ["Waste Management", "Biohazard / Sharps Waste"] },
  { number: 13, domain: "Equipment & Controls", text: "Do you use compressed gases, cryogens, vacuum systems, pressure vessels, or high/low temperature systems?", kind: "boolean", triggers: ["Compressed Gas", "Cryogens"] },
  { number: 14, domain: "Equipment & Controls", text: "Do you have fume hoods, BSCs, autoclaves, eyewashes, showers, ventilation systems, or critical alarms?", kind: "boolean", triggers: ["Equipment & Engineering Controls", "BSC Register", "Fume Hood Register", "Autoclave / Decontamination"] },
  { number: 15, domain: "Operations & Processes", text: "Do you operate forklifts, pallet jacks, lifts, racking, conveyors, or loading docks?", kind: "boolean", triggers: ["Warehouse / Material Handling"] },
  { number: 16, domain: "People & Governance", text: "Do contractors or vendors perform work on site?", kind: "boolean", triggers: ["Contractor / Vendor Compliance"] },
  { number: 17, domain: "Operations & Processes", text: "Do you ship or transport regulated materials, diagnostic specimens, biological substances, chemicals, dry ice, radioactive materials, hazardous waste, or product samples?", kind: "boolean", triggers: ["Shipping / Transportation"] },
  { number: 18, domain: "High-Risk Exposures", text: "Do you possess, request, transfer, or use select agents, toxins, or biosecurity-sensitive materials?", kind: "boolean", triggers: ["Select Agents / Biosecurity", "Security / Access Control"] },
  { number: 19, domain: "High-Risk Exposures", text: "Do you purchase, store, use, dispose of, or transfer DEA-controlled substances or scheduled drugs?", kind: "boolean", triggers: ["Controlled Substances", "Security / Access Control"] },
  { number: 20, domain: "Operations & Processes", text: "Do you conduct pilot-scale, scale-up, reactive, flammable, pressure, or highly hazardous chemical processes that could trigger PSM/RMP screening?", kind: "boolean", triggers: ["Process Safety / PSM-RMP Screen"] },
  { number: 21, domain: "High-Risk Exposures", text: "Do you handle high-potency APIs, hazardous drugs, antineoplastic materials, or potent compounds requiring containment bands?", kind: "boolean", triggers: ["HPAPI / Hazardous Drug"] },
  { number: 22, domain: "Equipment & Controls", text: "Do you store or ship temperature-sensitive materials, cold-chain products, cryogenic samples, or critical freezer/refrigerator inventory?", kind: "boolean", triggers: ["Cold Chain / Critical Storage"] },
  { number: 23, domain: "Records & Data", text: "Do you maintain safety records that must stay attributable and tamper-evident (incident logs, exposure monitoring, training records, inspection records)?", kind: "boolean", triggers: ["Document Control"] },
  { number: 24, domain: "Data & Security", text: "Do any workflows involve restricted access, personal/health information, or chain-of-custody for sensitive samples?", kind: "boolean", triggers: ["Security / Access Control"] },
  { number: 25, domain: "People & Governance", text: "What federal, state, local, permit, license, accreditation, customer, or internal SOP requirements apply?", kind: "text", triggers: ["Environmental Compliance", "Document Control"] },
  { number: 26, domain: "People & Governance", text: "Who is qualified to review, approve, inspect, close CAPA, sign manifests, authorize work, and approve changes?", kind: "text", triggers: ["Qualified Person Registry", "Committee Management"] },
];

// Programs every client gets (Manual §5 / engine rule "all clients").
export const ALWAYS_ON_PROGRAMS: string[] = [
  "General Workplace Safety",
  "HazCom / Chemical Management",
  "PPE",
  "Emergency Action",
  "Fire & Life Safety",
  "Spill Response",
  "Incident / Near Miss",
  "CAPA",
  "Training & Competency",
  "Document Control",
  "Audit Readiness",
  "Predictive Risk Dashboard",
  "Management Review",
  "Qualified Person Registry",
];

/** An answer counts as "applicable" unless it is empty / no / none / n/a. */
export function answerIsAffirmative(answer: string | null | undefined): boolean {
  if (!answer) return false;
  const a = answer.trim().toLowerCase();
  if (!a) return false;
  return !["no", "none", "n/a", "na", "false", "0", "not applicable"].includes(a);
}
