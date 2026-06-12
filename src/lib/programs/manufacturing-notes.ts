// Per-program guidance for general_manufacturing (PredictSafe MFG), keyed by the
// program id in program-data.ts. The shared catalog stores the biotech framing in
// `biotechNote`; this map supplies the manufacturing equivalent so an MFG org sees
// OSHA 1910 general-industry context instead of lab/biosafety language.
//
// Reviewed and approved by the domain owner (2026-06-11), authored from OSHA
// 29 CFR 1910 general industry. Lab/biosafety-only programs (biosafety,
// bloodborne-pathogens, chemical-hygiene/CHO, vivarium) are intentionally
// omitted — the program detail page falls back to a neutral placeholder for any
// id not present here.
export const manufacturingProgramNotes: Record<string, string> = {
  communication:
    "Manufacturing sites must post HazCom labeling, machine-specific hazard signage, PPE requirements, and emergency contacts at production lines and entrances. Shift-handover communication and multilingual postings are common gaps on the plant floor — toolbox talks should reach every shift.",
  "ehs-management":
    "A plant EHS management system brings machine safety, lockout/tagout, ergonomics, and process safety under one framework. Documentation must stay audit-ready for OSHA general-industry (29 CFR 1910) inspections and any customer or ISO 45001 audits.",
  iipp:
    "Cal/OSHA requires an IIPP for all employers. A manufacturing IIPP must address machine, material-handling, ergonomic, chemical, and noise hazards across production areas, and be updated whenever new equipment, processes, or lines are introduced.",
  "osha-log":
    "Manufacturing facilities with 10 or more employees must keep OSHA 300 logs. Common recordables include lacerations, amputations, struck-by/caught-in injuries, and ergonomic strains. Amputations and in-patient hospitalizations are reportable to OSHA within 24 hours; fatalities within 8.",
  "chemical-management":
    "Production sites manage process chemicals, lubricants, solvents, coatings, and cleaning agents. Maintain SDS access at point of use, GHS labeling on transfer containers, segregation by hazard class, flammable-cabinet limits, and Tier II reporting where thresholds are exceeded.",
  "emergency-response":
    "Plant emergency plans must address fire, chemical release, machinery entrapment, and severe weather. Evacuation routes and assembly points must account for high-bay, multi-line layouts; coordinate with the local fire department on stored hazardous materials and high-hazard processes.",
  "spill-response":
    "Manufacturing spill response covers process chemicals, oils, coolants, and fuels. Stock spill kits sized to the largest container in each area, define reporting thresholds (Reportable Quantities), and train line operators on first-response containment and secondary containment at storage and loading areas.",
  "er-equipment":
    "Where corrosives or injurious chemicals are used, eyewash/safety showers must be within 10 seconds of travel. Inspect fire extinguishers (monthly visual, annual service), AEDs, first-aid kits, and spill kits — and keep travel paths to emergency equipment clear of pallets, WIP, and equipment.",
  ergonomics:
    "Manufacturing ergonomic risks include repetitive assembly motions, manual lifting, awkward postures at fixed stations, and power-tool vibration. Use Level 1 screening plus RULA/REBA/NIOSH-lift evaluations for high-risk tasks; job rotation, lift assists, and workstation-height adjustment are primary controls.",
  loto:
    "Lockout/tagout is central to manufacturing maintenance and servicing. Maintain machine-specific energy-control procedures for every powered machine (electrical, pneumatic, hydraulic, thermal, and stored energy), authorized-employee training, annual procedure audits, and group lockout for multi-person work.",
  "machine-guarding":
    "Point-of-operation guarding is the highest-frequency general-industry hazard. Guard presses, conveyors, robots, mixers, saws, and rotating equipment; verify interlocks, two-hand controls, and light curtains; and coordinate guard removal with LOTO during maintenance.",
  "fall-protection":
    "Manufacturing fall hazards occur at mezzanines, equipment platforms, pits, loading docks, and elevated maintenance access. Provide guardrails on open-sided surfaces 4 ft or higher, covers over floor openings, and personal fall arrest for elevated work without guardrails.",
  ppe:
    "PPE selection follows a written hazard assessment per task: eye/face protection for machining and chemicals, hearing protection in high-noise areas, cut-resistant gloves, steel-toe/metatarsal footwear, and respiratory protection where engineering controls are not sufficient.",
  "workplace-violence":
    "California SB 553 requires a written Workplace Violence Prevention Plan for nearly all employers. Plant programs should address access control, parking and shift-change exposure, and a violent-incident log, with a clear reporting path and investigation of every incident.",
  "warehouse-safety":
    "Covers storage, racking, housekeeping, dock operations, and pedestrian/forklift separation in receiving, staging, and finished-goods areas. Post load limits, keep aisles clear and marked, and use dock plates, wheel chocks, and trailer restraints at loading docks.",
  forklift:
    "Operators must be trained and evaluated for each powered-industrial-truck type, with recertification every 3 years or after an incident. Require daily pre-shift inspections, enforce pedestrian-separation and speed rules, and designate ventilated refuel/charge areas.",
  "rack-inspections":
    "Forklift strikes make pallet-rack damage common in manufacturing storage. Post load-capacity placards, inspect racking monthly (and annually by a qualified engineer), and immediately unload and tag out damaged uprights or beams; verify seismic anchorage where required.",
  "waste-management":
    "Manufacturing waste streams include spent solvents, used oil, coolants, sludges, contaminated rags, and universal waste (batteries, lamps). Determine generator status, label and date accumulation areas, manifest hazardous waste to permitted TSDFs, and train staff on segregation.",
  stormwater:
    "Industrial facilities with exposed materials or activities need an NPDES industrial stormwater permit and SWPPP. High-risk areas include outdoor material storage, loading docks, and waste areas — implement BMPs, conduct visual monitoring, and submit annual reports on schedule.",
  "air-quality":
    "Permitted emission sources at plants include boilers, generators, ovens, paint/coating booths, welding, and solvent use. Maintain operating logs within permit limits, complete required stack testing, and file annual emission inventories with the local air district.",
  "regulatory-permits":
    "Track all operating permits and registrations: HMBP/hazmat storage, air permit-to-operate, wastewater discharge, fire-code permits, and business licenses. Maintain a renewal calendar — a lapsed permit can trigger fines or a facility shutdown.",
  "work-permits":
    "Manufacturing confined spaces include tanks, pits, silos, and mixers; hot work occurs during welding, cutting, and grinding maintenance. Use permit-to-work with atmospheric monitoring, attendants and a rescue plan for confined-space entry, and a fire watch for hot work.",
  "injury-investigation":
    "Investigate every recordable injury, near-miss, and equipment-damage event for root cause (5-Whys, fishbone), assign corrective actions with owners and due dates, update the OSHA 300 log within 7 days, and trend injuries by line, shift, and task each quarter.",
};
