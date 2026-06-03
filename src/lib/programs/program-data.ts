// ---------------------------------------------------------------------------
// Safety Program Library — Biotech / Life Science EHS compliance data
// Each entry drives /programs/[id] tool pages and the dashboard index.
// ---------------------------------------------------------------------------

export type ProgramFrequency = "Annual" | "Quarterly" | "Monthly" | "Ongoing" | "Per-Event";

export type ComplianceChecklistItem = {
  id: string;
  label: string;
  detail?: string;
};

export type ProgramData = {
  id: string;
  title: string;
  subtitle?: string;
  group: string;
  groupLabel: string;
  regulation: string;             // Primary regulatory citation
  additionalRegs?: string[];      // Other applicable standards
  frequency: ProgramFrequency;
  owner: string;                  // Responsible role
  biotechNote: string;            // Biotech-specific context
  overview: string;               // 2-3 sentence description
  requirements: string[];         // Key program elements required
  checklist: ComplianceChecklistItem[];
  relatedHref?: string;           // Link to existing platform module
  relatedLabel?: string;
  inspectionHref: string;         // Link to log inspection for this program
};

export const programData: ProgramData[] = [
  // ── Administrative & Communication ────────────────────────────────────────

  {
    id: "communication",
    title: "Safety Communication",
    group: "admin",
    groupLabel: "Administrative & Communication",
    regulation: "29 CFR 1910.1200 (HazCom); OSHA 29 CFR 1903.2",
    additionalRegs: ["Cal/OSHA CCR Title 8 §340", "OSHA 29 CFR 1910.132"],
    frequency: "Ongoing",
    owner: "EHS Manager",
    biotechNote: "Biotech labs must post biosafety level signage, SDS access notices, and PPE requirements at lab entry points. IBC-required postings and emergency contacts must be current.",
    overview: "Ensures all employees receive timely, accessible EHS information including hazard postings, safety bulletins, toolbox talks, and emergency notifications. Drives SDS accessibility and right-to-know compliance.",
    requirements: [
      "Posted 'It's The Law' OSHA poster at all work sites",
      "Emergency contact numbers posted at each lab/work area entry",
      "SDS accessible to all employees during their shift (electronic or binder)",
      "Biosafety level signage at BSL-1/2/3/4 lab entries (NIH/CDC format)",
      "Hazardous chemical/agent signage current and legible",
      "Safety meeting/toolbox talk records retained for 3 years",
      "Written safety communication plan or procedures"
    ],
    checklist: [
      { id: "c1", label: "OSHA 'It's The Law' poster posted and visible" },
      { id: "c2", label: "Emergency contact list current and posted at all entry points" },
      { id: "c3", label: "SDS system accessible to all employees (24/7 electronic or physical binder)" },
      { id: "c4", label: "BSL entry signs installed and current at all biological work areas" },
      { id: "c5", label: "Chemical hazard labels legible and GHS-compliant on all containers" },
      { id: "c6", label: "Safety bulletins/toolbox talks conducted and documented this quarter" },
      { id: "c7", label: "Safety committee meeting minutes posted or distributed" },
      { id: "c8", label: "IBC-required postings current (biohazard symbols, agent, BSO contact)" },
    ],
    inspectionHref: "/inspections?program=communication",
  },

  {
    id: "ehs-management",
    title: "EHS Management System",
    group: "admin",
    groupLabel: "Administrative & Communication",
    regulation: "29 CFR 1910 (General Industry); Cal/OSHA CCR Title 8",
    additionalRegs: ["ISO 45001", "ANSI Z10"],
    frequency: "Annual",
    owner: "EHS Manager / VP of Operations",
    biotechNote: "Biotech EHS programs must integrate biosafety (IBC), chemical safety (CHO), and GxP quality requirements. EHS documentation must be audit-ready for FDA, EPA, OSHA, and local fire authority inspections.",
    overview: "The overarching EHS management framework covering program structure, policy, roles/responsibilities, training, incident management, CAPA, audits, and continuous improvement. This is the umbrella under which all other programs operate.",
    requirements: [
      "Written EHS policy signed by executive leadership",
      "Defined EHS organizational structure with roles and responsibilities",
      "Annual EHS program evaluation / management review",
      "Incident management system (near-miss, first aid, recordable, lost-time)",
      "CAPA (Corrective and Preventive Action) process for EHS findings",
      "EHS training matrix with completion tracking",
      "Annual EHS audit schedule and execution",
      "Document control for all EHS records and procedures"
    ],
    checklist: [
      { id: "e1", label: "EHS policy statement current, signed, and posted" },
      { id: "e2", label: "EHS org chart with named responsible persons up to date" },
      { id: "e3", label: "Annual EHS program review completed and documented" },
      { id: "e4", label: "Incident reporting system operational and accessible to all employees" },
      { id: "e5", label: "Open CAPAs reviewed and on track for closure" },
      { id: "e6", label: "EHS training matrix current with completion ≥ 95%" },
      { id: "e7", label: "Annual internal EHS audit completed" },
      { id: "e8", label: "EHS records organized and accessible for regulatory inspection" },
      { id: "e9", label: "Management review meeting conducted (at least annually)" },
    ],
    relatedHref: "/operations",
    relatedLabel: "Open EHS Hub",
    inspectionHref: "/inspections?program=ehs-management",
  },

  {
    id: "iipp",
    title: "IIPP",
    subtitle: "Injury & Illness Prevention Program",
    group: "admin",
    groupLabel: "Administrative & Communication",
    regulation: "Cal/OSHA CCR Title 8 §3203",
    additionalRegs: ["OSHA 29 CFR 1910 (federal equivalent)"],
    frequency: "Annual",
    owner: "EHS Manager",
    biotechNote: "California-required for all employers. Biotech IIPPs must address laboratory hazards including biological, chemical, radiological, and physical agents. Must be updated when new processes, materials, or hazards are introduced.",
    overview: "California's mandatory written workplace safety and health program covering employer responsibilities, hazard identification and correction, employee communication, training, record keeping, and compliance with Cal/OSHA standards.",
    requirements: [
      "Written IIPP identifying responsible person(s)",
      "System for ensuring employee compliance with safe practices",
      "Communication system for safety and health matters",
      "Procedures for identifying and evaluating workplace hazards",
      "Procedures for correcting unsafe/unhealthy conditions",
      "Training and instruction for employees",
      "Records of inspections, training, and injury/illness"
    ],
    checklist: [
      { id: "i1", label: "Written IIPP document current (reviewed in past 12 months)" },
      { id: "i2", label: "Responsible person(s) named and aware of their duties" },
      { id: "i3", label: "Employee acknowledgment / disciplinary policy for non-compliance documented" },
      { id: "i4", label: "Safety committee or employee communication mechanism in place" },
      { id: "i5", label: "Workplace hazard inspections conducted on schedule and documented" },
      { id: "i6", label: "Hazard correction process with timelines and follow-up" },
      { id: "i7", label: "New employee EHS orientation documented" },
      { id: "i8", label: "IIPP training records retained ≥ 1 year (Cal/OSHA requirement)" },
    ],
    inspectionHref: "/inspections?program=iipp",
  },

  {
    id: "osha-log",
    title: "OSHA 300 Log & Year-End Reports",
    group: "admin",
    groupLabel: "Administrative & Communication",
    regulation: "29 CFR 1904 (OSHA Recordkeeping)",
    additionalRegs: ["Cal/OSHA CCR Title 8 §14300"],
    frequency: "Ongoing",
    owner: "EHS Manager / HR",
    biotechNote: "Biotech facilities with ≥10 employees must maintain OSHA 300 logs. Needlestick injuries, laboratory exposures, and BBP exposures are common recordable events. OSHA 300A must be posted Feb 1–Apr 30 annually.",
    overview: "Federal and California requirement to record all work-related injuries and illnesses meeting recordability criteria, submit Form 300A annual summary, and report severe injuries (hospitalization, amputation, eye loss) to OSHA within 24 hours.",
    requirements: [
      "OSHA Form 300 (injury and illness log) maintained and updated within 7 days",
      "OSHA Form 301 (incident report) completed for each recordable",
      "OSHA Form 300A (annual summary) posted Feb 1 – Apr 30",
      "Electronic submission of 300A to OSHA if required (250+ employees or high-hazard with 20+)",
      "Severe injury reports to OSHA within 24 hours (hospitalization, amputation, loss of eye)",
      "Fatality reports within 8 hours",
      "Records retained for 5 years"
    ],
    checklist: [
      { id: "o1", label: "OSHA 300 log current and accurate (all incidents recorded within 7 days)" },
      { id: "o2", label: "OSHA 301 incident investigation form completed for each recordable" },
      { id: "o3", label: "OSHA 300A annual summary completed and certified by company exec" },
      { id: "o4", label: "300A posted (Feb 1 – Apr 30) in visible location" },
      { id: "o5", label: "Electronic submission completed if required" },
      { id: "o6", label: "Severe injury notification system in place (24-hr reporting)" },
      { id: "o7", label: "Records retained for 5+ years" },
      { id: "o8", label: "Employees informed of right to access injury/illness records" },
    ],
    inspectionHref: "/inspections?program=osha-log",
  },

  // ── Laboratory & Chemical ─────────────────────────────────────────────────

  {
    id: "biosafety",
    title: "BioSafety — BSL-1, 2, 3, 4",
    group: "laboratory",
    groupLabel: "Laboratory & Chemical Safety",
    regulation: "CDC/NIH Biosafety in Microbiological and Biomedical Laboratories (BMBL 6th Ed.)",
    additionalRegs: ["NIH Guidelines for rDNA Research", "OSHA 29 CFR 1910.1030 (BBP)", "Cal/OSHA CCR Title 8 §5193"],
    frequency: "Annual",
    owner: "Biosafety Officer (BSO)",
    biotechNote: "All biotech labs working with biological agents must have an active IBC (Institutional Biosafety Committee) if using rDNA or select agents. BSL-2 is the minimum for human-derived materials. BSL-3/4 facilities require specialized engineering controls and additional regulatory oversight.",
    overview: "Biosafety Level classifications (BSL-1 through BSL-4) define containment requirements, PPE, engineering controls, work practices, and waste management for work with biological agents. Managed by the Biosafety Officer and overseen by the IBC.",
    requirements: [
      "Institutional Biosafety Committee (IBC) registered and active (if rDNA or select agents)",
      "Biosafety Manual current and accessible to all lab personnel",
      "BSL signage posted at all lab entry points (biohazard, agent, BSO contact, PPE)",
      "Annual biosafety training for all personnel working with biological agents",
      "Biological Safety Cabinet (BSC) certified annually",
      "Autoclave validation and spore testing on schedule",
      "Biological waste management and disposal procedures documented",
      "Emergency/spill response procedures for biological agents posted"
    ],
    checklist: [
      { id: "b1", label: "IBC registration current and committee meeting minutes documented" },
      { id: "b2", label: "Biosafety Manual reviewed and updated in past 12 months" },
      { id: "b3", label: "BSL entry signage correct at all biological work areas" },
      { id: "b4", label: "All biological agent workers completed annual biosafety training" },
      { id: "b5", label: "BSC certification current (annual NSF 49 certification)" },
      { id: "b6", label: "Autoclave/sterilizer validation logs current" },
      { id: "b7", label: "Biological waste containers properly labeled and staged" },
      { id: "b8", label: "Spill response kit present and accessible in each biological work area" },
      { id: "b9", label: "Decontamination procedures posted and staff trained" },
      { id: "b10", label: "PPE (lab coat, gloves, eye protection) available and used" },
    ],
    relatedHref: "/assessments",
    relatedLabel: "Open BioRisk Assessment",
    inspectionHref: "/inspections?program=biosafety",
  },

  {
    id: "bloodborne-pathogens",
    title: "Bloodborne Pathogens",
    group: "laboratory",
    groupLabel: "Laboratory & Chemical Safety",
    regulation: "OSHA 29 CFR 1910.1030",
    additionalRegs: ["Cal/OSHA CCR Title 8 §5193", "CDC BMBL 6th Ed."],
    frequency: "Annual",
    owner: "Biosafety Officer / EHS Manager",
    biotechNote: "Critical in biotech for labs working with human-derived materials (cell lines, blood, tissues, patient samples). Hepatitis B vaccination must be offered to all occupationally exposed employees within 10 days of hire. Needlestick and sharps injuries require immediate post-exposure evaluation.",
    overview: "OSHA BBP standard requires a written Exposure Control Plan (ECP) for all employees with reasonably anticipated occupational exposure to blood or other potentially infectious materials (OPIM), with engineering controls, PPE, vaccination, training, and post-exposure protocols.",
    requirements: [
      "Written Exposure Control Plan (ECP) updated annually and after new tasks/procedures",
      "Exposure determination identifying at-risk job classifications",
      "Engineering controls: sharps disposal containers, needleless systems reviewed annually",
      "PPE provided at no cost to employees",
      "Hepatitis B vaccination offered within 10 days of hire to exposed workers",
      "Annual BBP training (at hire and annually thereafter)",
      "Post-exposure evaluation and follow-up procedures documented",
      "Biohazard labels on all regulated waste, refrigerators, containers"
    ],
    checklist: [
      { id: "bp1", label: "Exposure Control Plan current (updated in past 12 months)" },
      { id: "bp2", label: "Exposure determination list current with new job roles added" },
      { id: "bp3", label: "Engineering control review documented (annual needlestick device review)" },
      { id: "bp4", label: "Sharps containers ≤ ¾ full and properly staged" },
      { id: "bp5", label: "Hep B vaccination records on file for all occupationally exposed employees" },
      { id: "bp6", label: "Annual BBP training completed for all at-risk employees" },
      { id: "bp7", label: "Post-exposure procedure posted and staff aware of steps" },
      { id: "bp8", label: "Medical records retained for 30 years + duration of employment" },
      { id: "bp9", label: "Biohazard labels on all regulated waste, containers, and refrigerators" },
    ],
    inspectionHref: "/inspections?program=bloodborne-pathogens",
  },

  {
    id: "chemical-hygiene",
    title: "Chemical Hygiene / CHO",
    subtitle: "Laboratory Only — SME Required",
    group: "laboratory",
    groupLabel: "Laboratory & Chemical Safety",
    regulation: "OSHA 29 CFR 1910.1450 (Laboratory Standard)",
    additionalRegs: ["Cal/OSHA CCR Title 8 §5191", "OSHA PELs 29 CFR 1910 Subpart Z"],
    frequency: "Annual",
    owner: "Chemical Hygiene Officer (CHO)",
    biotechNote: "The OSHA Lab Standard applies to all laboratories using hazardous chemicals at less than OSHA-defined lab scale. Biotech labs must designate a CHO — typically a PhD scientist or EHS professional with specific chemical safety knowledge. The CHP must address all lab-scale work with hazardous chemicals including solvents, reagents, biologicals, and radioactive materials.",
    overview: "OSHA's Laboratory Standard requires laboratories to have a written Chemical Hygiene Plan (CHP), designate a Chemical Hygiene Officer, implement exposure controls, conduct monitoring when indicated, and train all laboratory employees annually.",
    requirements: [
      "Written Chemical Hygiene Plan (CHP) updated annually",
      "Chemical Hygiene Officer (CHO) designated in writing",
      "Exposure controls defined for each hazardous chemical used",
      "Particularly Hazardous Substances (PHS) identified with prior approval procedures",
      "Engineering controls: fume hoods certified annually (100 FPM face velocity)",
      "Annual laboratory chemical hygiene training for all lab personnel",
      "Medical surveillance for employees with potential exposures",
      "Record retention: exposure records 30 years, training 3 years"
    ],
    checklist: [
      { id: "ch1", label: "Chemical Hygiene Plan current (reviewed in past 12 months)" },
      { id: "ch2", label: "CHO designated in writing with current contact information" },
      { id: "ch3", label: "Fume hood face velocity certification current (100 FPM or per design)" },
      { id: "ch4", label: "PHS (carcinogens, reproductive hazards, acutely toxic chemicals) identified with controls" },
      { id: "ch5", label: "Prior approval procedures for PHS work documented" },
      { id: "ch6", label: "Annual chemical hygiene training completed for all lab personnel" },
      { id: "ch7", label: "Chemical inventory current and SDS available for all chemicals on site" },
      { id: "ch8", label: "Chemical storage segregation practiced (acids/bases, oxidizers/flammables)" },
      { id: "ch9", label: "No chemicals stored in fume hoods (hoods not used as storage)" },
      { id: "ch10", label: "Exposure monitoring conducted if indicated by use pattern or complaints" },
    ],
    inspectionHref: "/inspections?program=chemical-hygiene",
  },

  {
    id: "chemical-management",
    title: "Chemical Management",
    group: "laboratory",
    groupLabel: "Laboratory & Chemical Safety",
    regulation: "OSHA 29 CFR 1910.1200 (HazCom); OSHA 29 CFR 1910.106 (Flammables)",
    additionalRegs: ["Cal Fire Title 19", "Local CUPA/HMMD requirements", "EPA 40 CFR 260-270 (RCRA)"],
    frequency: "Quarterly",
    owner: "Chemical Hygiene Officer / EHS Manager",
    biotechNote: "Biotech facilities must manage CalARP (California Accidental Release Prevention) thresholds, CUPA hazardous material storage plans, and integrate chemical inventory with waste management. Most biotech labs have Tier II reporting obligations if they exceed threshold planning quantities.",
    overview: "Comprehensive management of all hazardous chemicals including SDS library maintenance, chemical inventory, GHS labeling, proper storage segregation, secondary containment, Tier II reporting, and procurement approval controls.",
    requirements: [
      "Chemical inventory current (all chemicals on-site inventoried)",
      "SDS for every hazardous chemical accessible to employees",
      "GHS labeling on all secondary containers",
      "Chemical storage segregation by hazard class",
      "Flammable storage in FM-approved cabinets; limits per fire code",
      "Secondary containment for liquid hazardous chemicals",
      "Tier II reporting (if Extremely Hazardous Substances exceed TPQ)",
      "Chemical approval/procurement process to review new chemicals before arrival"
    ],
    checklist: [
      { id: "cm1", label: "Chemical inventory updated and reconciled in past quarter" },
      { id: "cm2", label: "SDS for all chemicals current and accessible (electronic or binder)" },
      { id: "cm3", label: "All secondary containers GHS labeled (identity + hazard pictograms)" },
      { id: "cm4", label: "Chemicals stored by hazard class; no incompatible materials co-stored" },
      { id: "cm5", label: "Flammable storage within fire code limits; FM-approved cabinets used" },
      { id: "cm6", label: "Secondary containment in place for all liquid hazardous chemicals" },
      { id: "cm7", label: "Tier II report submitted by March 1 deadline (if applicable)" },
      { id: "cm8", label: "Expired or no-longer-needed chemicals disposed of properly" },
      { id: "cm9", label: "New chemical approval process followed before purchase" },
    ],
    inspectionHref: "/inspections?program=chemical-management",
  },

  {
    id: "vivarium",
    title: "Vivarium",
    group: "laboratory",
    groupLabel: "Laboratory & Chemical Safety",
    regulation: "Animal Welfare Act (9 CFR 1–4); PHS Policy on Humane Care and Use of Lab Animals",
    additionalRegs: ["NIH Guide for Care and Use of Laboratory Animals", "OSHA 29 CFR 1910.1030 (zoonotic/BBP)"],
    frequency: "Annual",
    owner: "IACUC / Veterinarian / Vivarium Manager",
    biotechNote: "Any biotech using animals in research must have an active IACUC protocol approval. Rodent allergen exposure is the most common occupational hazard in vivarium settings. Respiratory protection and medical surveillance for allergen sensitization are required. Zoonotic disease risk must be assessed for each species.",
    overview: "Governs the care, use, and welfare of laboratory animals including IACUC oversight, facility standards, occupational health for animal workers (zoonotic disease, allergen exposure), PPE requirements, and biosafety integration for animals used in infectious disease research.",
    requirements: [
      "Active IACUC registration with OLAW (if PHS funding) or USDA AWA registration",
      "IACUC protocol approval for each animal study",
      "Annual IACUC program review / facility inspection (semi-annual for USDA species)",
      "Occupational health program for animal workers (medical questionnaire, respirator fit-test if required)",
      "Rodent allergen control program (respiratory protection, PPE)",
      "Zoonotic disease risk assessment for all species",
      "Animal biosafety integration for infected animals (if applicable)",
      "Veterinary care program and sick animal reporting procedure"
    ],
    checklist: [
      { id: "v1", label: "IACUC registration/accreditation current (OLAW assurance, USDA registration)" },
      { id: "v2", label: "All active animal studies have current IACUC protocol approval" },
      { id: "v3", label: "Semi-annual facility inspection completed and report filed with IACUC" },
      { id: "v4", label: "Occupational health questionnaire completed for all animal workers" },
      { id: "v5", label: "Respirator fit-test current for personnel with allergen/exposure risk" },
      { id: "v6", label: "Rodent allergen controls in place (ventilated cage change stations, PPE)" },
      { id: "v7", label: "Zoonotic risk assessment documented for each animal species on site" },
      { id: "v8", label: "Veterinary health records current for all research animals" },
      { id: "v9", label: "Animal room biosafety signage and containment appropriate for studies" },
    ],
    inspectionHref: "/inspections?program=vivarium",
  },

  // ── Emergency Response ────────────────────────────────────────────────────

  {
    id: "emergency-response",
    title: "Emergency Response",
    group: "emergency",
    groupLabel: "Emergency Response & Spill",
    regulation: "OSHA 29 CFR 1910.38 (Emergency Action Plan)",
    additionalRegs: ["29 CFR 1910.120 (HAZWOPER)", "Cal/OSHA CCR Title 8 §3220", "Cal OES HMBP (if Tier II)"],
    frequency: "Annual",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech emergency response must address unique scenarios: biological release, chemical spill, cryogen failure (liquid nitrogen), and fire suppression conflicts with biological agents. Fire department pre-incident planning visits are required for CUPA facilities. Emergency response integration with the IBC is needed for biological incidents.",
    overview: "Written Emergency Action Plan (EAP) covering evacuation routes, assembly points, fire brigade/emergency response team, emergency contacts, accountability procedures, and coordination with local emergency services. Required for all employers with >10 employees.",
    requirements: [
      "Written Emergency Action Plan (EAP) reviewed annually and after facility changes",
      "Evacuation routes posted on all floors and in all work areas",
      "Assembly points designated and communicated to all employees",
      "Emergency contact list current and posted",
      "Annual emergency drill (evacuation, fire, chemical/biological release)",
      "Emergency response team / fire brigade trained if applicable",
      "Coordination procedure with local fire department / HAZMAT team",
      "Alarm system tested semi-annually"
    ],
    checklist: [
      { id: "er1", label: "Emergency Action Plan current and reviewed in past 12 months" },
      { id: "er2", label: "Evacuation maps posted in all work areas (updated for any facility changes)" },
      { id: "er3", label: "Assembly areas designated, marked, and communicated to all employees" },
      { id: "er4", label: "Emergency contacts current and posted at all entry points" },
      { id: "er5", label: "Annual evacuation drill conducted and documented" },
      { id: "er6", label: "Emergency response team members current with training and contact info" },
      { id: "er7", label: "Local fire department notified of hazardous materials on site (HMBP)" },
      { id: "er8", label: "Fire alarm system tested in past 6 months" },
      { id: "er9", label: "Cryogen (LN2) emergency procedure in place if cryogens on site" },
    ],
    inspectionHref: "/inspections?program=emergency-response",
  },

  {
    id: "spill-response",
    title: "Spill Response",
    group: "emergency",
    groupLabel: "Emergency Response & Spill",
    regulation: "29 CFR 1910.120 (HAZWOPER); OSHA 29 CFR 1910.38",
    additionalRegs: ["EPA 40 CFR 112 (SPCC)", "Cal/OSHA CCR Title 8 §5192", "CDC BMBL Spill Procedures"],
    frequency: "Annual",
    owner: "EHS Manager / Biosafety Officer",
    biotechNote: "Biotech spill response must differentiate between chemical spills, biological spills, and combination events. BSL-2 biological spills require specific decontamination agents (10% bleach or equivalent) and dwell times. Mercury spills (thermometers, instruments) require specialized cleanup. LN2 spills are an asphyxiation hazard.",
    overview: "Procedures for safe, effective response to hazardous material spills including chemical, biological, and combined events. Includes spill kit inventory, decontamination protocols, reporting thresholds, evacuation triggers, and drill documentation.",
    requirements: [
      "Written spill response procedures for chemical, biological, and cryogen spills",
      "Spill kits stocked and staged in all areas where hazardous materials are used",
      "Spill kit contents appropriate to materials on hand (neutralizers, PPE, absorbent)",
      "Spill reporting thresholds and notification procedures defined",
      "Biological spill procedures including decontamination agent and contact time",
      "Annual spill response drill/tabletop exercise",
      "Post-spill investigation and CAPA process",
      "External reporting requirements documented (Reportable Quantities, local fire)"
    ],
    checklist: [
      { id: "sp1", label: "Spill response procedures documented and posted in all hazardous areas" },
      { id: "sp2", label: "Spill kits inspected and restocked (contents intact, not expired)" },
      { id: "sp3", label: "Biological spill kit contains appropriate disinfectant (10% bleach or EPA-registered)" },
      { id: "sp4", label: "All employees in hazmat areas trained in spill response procedures" },
      { id: "sp5", label: "Annual spill drill conducted and documented" },
      { id: "sp6", label: "Spill reporting contacts and thresholds posted and known to staff" },
      { id: "sp7", label: "Previous spill incidents investigated; CAPAs closed" },
      { id: "sp8", label: "Mercury-free thermometers/instruments policy in place (or Hg spill kit available)" },
    ],
    inspectionHref: "/inspections?program=spill-response",
  },

  {
    id: "er-equipment",
    title: "ER Equipment Inspection",
    subtitle: "Emergency Response Equipment",
    group: "emergency",
    groupLabel: "Emergency Response & Spill",
    regulation: "OSHA 29 CFR 1910.151 (First Aid); 29 CFR 1910.157 (Fire Extinguishers); ANSI Z358.1",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3400", "NFPA 10", "Cal Fire Title 19 §570"],
    frequency: "Monthly",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech facilities with corrosive chemicals (acids, bases) must have eyewash/safety showers within 10 seconds of travel. Lab-grade AEDs are required in many biotech campuses. Fire extinguisher types must match hazards — CO2 preferred near electronic equipment, dry chemical avoided in clean labs.",
    overview: "Regular inspection and maintenance of all emergency response equipment including eyewash stations, safety showers, fire extinguishers, AEDs, first aid kits, and spill kits to ensure they are operational when needed.",
    requirements: [
      "Eyewash stations and safety showers: weekly activation test, annual flow/inspection",
      "Fire extinguishers: monthly visual inspection, annual service by licensed contractor",
      "AEDs: monthly inspection, battery and pad replacement per manufacturer schedule",
      "First aid kits: monthly contents inspection and restocking",
      "Spill kits: quarterly inspection and restocking after use",
      "All equipment identified on a facility map/inventory",
      "Equipment inspection logs maintained and accessible"
    ],
    checklist: [
      { id: "ee1", label: "All eyewash stations activated and flushed this week (weekly test logged)" },
      { id: "ee2", label: "Safety showers tested monthly (flow, temperature, obstructions)" },
      { id: "ee3", label: "Fire extinguishers monthly visual check complete (pin, gauge, condition)" },
      { id: "ee4", label: "Fire extinguishers annually serviced by licensed contractor (tags current)" },
      { id: "ee5", label: "AEDs operational, pads and batteries within replacement date" },
      { id: "ee6", label: "First aid kits stocked per ANSI requirements (no expired items)" },
      { id: "ee7", label: "Spill kits restocked after use; contents appropriate for current hazards" },
      { id: "ee8", label: "All equipment accessible — no obstructions within 10-second travel path" },
      { id: "ee9", label: "Equipment inventory/location map current and posted" },
    ],
    inspectionHref: "/inspections?program=er-equipment",
  },

  // ── Physical Safety ───────────────────────────────────────────────────────

  {
    id: "ergonomics",
    title: "Ergonomics",
    group: "physical",
    groupLabel: "Physical Safety & Hazard Controls",
    regulation: "Cal/OSHA CCR Title 8 §5110 (Repetitive Motion Injuries)",
    additionalRegs: ["OSHA General Duty Clause", "ANSI/HFES 100"],
    frequency: "Annual",
    owner: "EHS Manager",
    biotechNote: "Biotech labs have unique ergonomic hazards: repetitive pipetting (wrist/hand), microscope work (neck/back), centrifuge loading, cryogenic sample handling, and computer workstation use. Level 1 screening and Level 2 RULA/REBA evaluations are used to identify and control musculoskeletal injury risk.",
    overview: "Systematic identification and control of musculoskeletal injury risk factors through workstation assessments, job rotation, engineering controls, and worker training. California §5110 triggers a formal program when 2+ employees have the same RMI from the same work in 12 months.",
    requirements: [
      "Ergonomic hazard identification process (Level 1 screening for all job tasks)",
      "Level 2 evaluation (RULA, REBA, NIOSH Lifting Equation) for high-risk tasks",
      "Engineering controls: adjustable workstations, pipetting aids, anti-fatigue mats",
      "Employee training on ergonomic risk factors and safe techniques",
      "Injury investigation linking MSI/RMI to specific tasks",
      "Cal/OSHA §5110 program if triggered (2+ RMI from same risk factor in 12 months)"
    ],
    checklist: [
      { id: "eg1", label: "Level 1 ergonomic screenings conducted for new/changed job tasks" },
      { id: "eg2", label: "High-risk tasks (score > 3) have Level 2 evaluations completed" },
      { id: "eg3", label: "Open corrective actions from ergonomic evaluations tracked to closure" },
      { id: "eg4", label: "Ergonomic controls implemented (adjustable furniture, pipetting aids, rests)" },
      { id: "eg5", label: "Ergonomics training provided to all employees in high-risk roles" },
      { id: "eg6", label: "MSD/RMI injury trend reviewed quarterly" },
    ],
    relatedHref: "/ergonomics/self-assessment",
    relatedLabel: "Start Level 1 Screening",
    inspectionHref: "/inspections",
  },

  {
    id: "loto",
    title: "LOTO",
    subtitle: "Lockout / Tagout — Control of Hazardous Energy",
    group: "physical",
    groupLabel: "Physical Safety & Hazard Controls",
    regulation: "OSHA 29 CFR 1910.147",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3314", "NFPA 70E (electrical safety)"],
    frequency: "Annual",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech equipment requiring LOTO includes HVAC/air handlers, autoclaves, centrifuges, fermenters, fill-finish lines, and HVAC systems for BSL-3 facilities. Biological containment must be maintained during equipment servicing — LOTO procedures must coordinate with biosafety controls.",
    overview: "Requires employers to establish procedures to ensure that hazardous energy sources (electrical, mechanical, pneumatic, hydraulic, chemical, thermal, gravity) are isolated and de-energized before maintenance or service activities that could expose employees to injury.",
    requirements: [
      "Written Energy Control Program (ECP)",
      "Energy control procedures for each piece of equipment with multiple energy sources",
      "Authorized employee training (those who lockout equipment)",
      "Affected employee training (those who work in area)",
      "Annual LOTO procedure inspection for each piece of equipment",
      "Equipment-specific LOTO hardware (locks, tags, hasps, lockboxes) available",
      "Contractor LOTO coordination procedures"
    ],
    checklist: [
      { id: "lo1", label: "Written Energy Control Program current and accessible" },
      { id: "lo2", label: "Equipment-specific LOTO procedures written for all applicable equipment" },
      { id: "lo3", label: "Authorized employees trained and listed for each procedure" },
      { id: "lo4", label: "Annual LOTO procedure audit completed for all equipment (inspector vs. authorized employee)" },
      { id: "lo5", label: "LOTO hardware available, individually assigned, and accounted for" },
      { id: "lo6", label: "Contractor LOTO procedures reviewed and coordination documented" },
      { id: "lo7", label: "No bypassing of LOTO — group lockout procedures in use where needed" },
    ],
    inspectionHref: "/inspections?program=loto",
  },

  {
    id: "machine-guarding",
    title: "Machine Guarding",
    group: "physical",
    groupLabel: "Physical Safety & Hazard Controls",
    regulation: "OSHA 29 CFR 1910.212 (General Machine Guarding)",
    additionalRegs: ["29 CFR 1910.213-219 (specific machines)", "Cal/OSHA CCR Title 8 §4000-4184", "ANSI B11 series"],
    frequency: "Annual",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech equipment requiring guarding includes centrifuges, homogenizers, biosafety cabinets with UV shutters, freeze-dryers, robotics/automated liquid handlers, and fill-finish equipment. Rotating equipment must have guards preventing contact at the point of operation.",
    overview: "Requires guards on all machines where hazardous moving parts, rotation, or point-of-operation hazards could cause injury. Guards must be strong, secure, and not interfere with normal operation.",
    requirements: [
      "Machine inventory with guarding assessment for each piece of equipment",
      "Point-of-operation guards on all equipment with exposed hazards",
      "Guards inspected for integrity before each use or weekly",
      "Operator training on guarding requirements and no-bypass policy",
      "Procedures for guard removal during maintenance (coordinated with LOTO)",
      "Machine guarding inspection program with documented results"
    ],
    checklist: [
      { id: "mg1", label: "Machine inventory with guarding status documented" },
      { id: "mg2", label: "All point-of-operation hazards guarded or otherwise controlled" },
      { id: "mg3", label: "Guards intact, secure, and not bypassed on all equipment" },
      { id: "mg4", label: "Centrifuge rotor covers/lids in place and latched during operation" },
      { id: "mg5", label: "Automated equipment (robotics, liquid handlers) has safety interlocks" },
      { id: "mg6", label: "Machine guarding inspection tour completed and documented" },
      { id: "mg7", label: "LOTO procedure covers guard removal scenarios" },
    ],
    inspectionHref: "/inspections?program=machine-guarding",
  },

  {
    id: "fall-protection",
    title: "Fall Protection",
    group: "physical",
    groupLabel: "Physical Safety & Hazard Controls",
    regulation: "OSHA 29 CFR 1910.23 (Ladders); 29 CFR 1910.29 (Fall Protection Systems)",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3270-3281", "ANSI A14 (Ladders)", "ANSI Z359 (Fall Arrest)"],
    frequency: "Annual",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech facilities commonly have fall hazards at mezzanines, equipment platforms, roof access for HVAC, and loading docks. BSL-3 facilities with ceiling-mounted equipment may require elevated work with biological containment considerations.",
    overview: "Controls fall hazards through engineering controls (guardrails, covers), personal fall arrest systems (harnesses, lanyards, anchors), and work procedures for elevated work on ladders, platforms, and rooftops.",
    requirements: [
      "Fall hazard survey of all elevated work areas ≥ 4 ft (general industry)",
      "Guardrails (42\" top rail, 21\" mid-rail) on all open-sided floors, platforms",
      "Floor/wall openings covered or guarded",
      "Ladder program: ladder selection, inspection, and safe use training",
      "Personal fall arrest system (PFAS): harness, lanyard, anchorage for work >6 ft without guardrail",
      "Fall protection plan for specific tasks requiring PFAS",
      "Training for employees exposed to fall hazards"
    ],
    checklist: [
      { id: "fp1", label: "Fall hazard survey completed for all elevated work areas" },
      { id: "fp2", label: "Guardrails in place and structurally sound on all mezzanines, platforms, loading docks" },
      { id: "fp3", label: "Floor openings covered and secured (covers rated for loads)" },
      { id: "fp4", label: "Ladder inventory current; damaged ladders tagged out and removed" },
      { id: "fp5", label: "Ladder safety training documented for all employees using ladders" },
      { id: "fp6", label: "PFAS equipment (harnesses, lanyards) inspected annually and after any fall event" },
      { id: "fp7", label: "Anchorage points engineered and rated (5,000 lb per employee)" },
    ],
    inspectionHref: "/inspections?program=fall-protection",
  },

  {
    id: "ppe",
    title: "PPE",
    subtitle: "Personal Protective Equipment",
    group: "physical",
    groupLabel: "Physical Safety & Hazard Controls",
    regulation: "OSHA 29 CFR 1910.132–138 (PPE Standards)",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3380-3385", "ANSI/ISEA Z87.1 (Eye), Z41 (Foot), Z89.1 (Head)"],
    frequency: "Annual",
    owner: "EHS Manager",
    biotechNote: "Biotech PPE programs must address layered protection: lab coats and gloves for biological work, face shields for chemical splashes, cryogenic gloves for LN2 handling, and specialized gloves for chemotherapy drug handling. PPE selection must be based on a written hazard assessment, not just general practice.",
    overview: "Requires a written PPE hazard assessment for each job task, selection and provision of appropriate PPE at no cost to employees, employee training on proper use and care, and documentation that the assessment and training have been completed.",
    requirements: [
      "Written PPE hazard assessment (certification) by task/job",
      "PPE selected based on hazard assessment (ANSI/ISEA standards)",
      "PPE provided at no cost to employees",
      "Employee training on PPE selection, use, limitations, and care",
      "PPE inspection program (daily before use; periodic formal inspection)",
      "Glove selection chart for chemical hazards posted in lab areas",
      "Respiratory protection program (if respirators used — see 1910.134)"
    ],
    checklist: [
      { id: "pp1", label: "PPE hazard assessment certification document current for all job tasks" },
      { id: "pp2", label: "Appropriate PPE available and accessible in all work areas" },
      { id: "pp3", label: "Employees trained on correct PPE for their tasks (records on file)" },
      { id: "pp4", label: "Chemical-resistant glove selection chart posted in lab areas" },
      { id: "pp5", label: "Cryogenic (LN2) gloves available where cryogenic materials are handled" },
      { id: "pp6", label: "Face shields available for chemical splash and high-splatter tasks" },
      { id: "pp7", label: "No expired, damaged, or inappropriate PPE in use" },
      { id: "pp8", label: "Lab coats worn and properly laundered (not taken home)" },
    ],
    inspectionHref: "/inspections?program=ppe",
  },

  {
    id: "workplace-violence",
    title: "Workplace Violence Prevention",
    group: "physical",
    groupLabel: "Physical Safety & Hazard Controls",
    regulation: "Cal/OSHA SB 553 (AB 2076); CCR Title 8 §3342 (effective July 1, 2024)",
    additionalRegs: ["OSHA General Duty Clause", "Cal/OSHA Healthcare WVPP §3342.1"],
    frequency: "Annual",
    owner: "EHS Manager / HR / Security",
    biotechNote: "California SB 553 requires ALL employers (with limited exceptions) to have a written WVPP as of July 1, 2024. Biotech facilities with animal research have unique considerations for activist threats. Laboratories and clean rooms must address visitor/contractor access controls.",
    overview: "California SB 553 requires a written Workplace Violence Prevention Plan (WVPP), violent incident log, training, and a means for employees to report workplace violence. Employers must investigate incidents and take corrective action.",
    requirements: [
      "Written Workplace Violence Prevention Plan (WVPP) adopted and implemented",
      "Employee training on WVPP at hire and annually thereafter",
      "Violent Incident Log maintained for all WPV events",
      "Procedures for employees to report WPV threats and incidents",
      "Incident investigation and corrective action process",
      "Annual WVPP review and update",
      "Access controls to prevent unauthorized entry"
    ],
    checklist: [
      { id: "wv1", label: "Written WVPP adopted and accessible to all employees (SB 553 compliant)" },
      { id: "wv2", label: "All employees trained on WVPP at hire and within past 12 months" },
      { id: "wv3", label: "Violent Incident Log maintained (use-of-force, threats, physical attacks)" },
      { id: "wv4", label: "Anonymous reporting mechanism available for WPV concerns" },
      { id: "wv5", label: "WPV incidents investigated with corrective actions documented" },
      { id: "wv6", label: "Building access controls functional (key fob, badge reader, visitor log)" },
      { id: "wv7", label: "Threat assessment team or process defined" },
    ],
    inspectionHref: "/inspections?program=workplace-violence",
  },

  // ── Warehouse & Material Handling ─────────────────────────────────────────

  {
    id: "warehouse-safety",
    title: "Warehouse Safety",
    group: "warehouse",
    groupLabel: "Warehouse & Material Handling",
    regulation: "OSHA 29 CFR 1910.176 (Material Handling and Storage)",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3273", "OSHA 29 CFR 1910.178 (PIT)"],
    frequency: "Quarterly",
    owner: "Warehouse Manager / EHS Manager",
    biotechNote: "Biotech warehouses store chemicals, biological materials, and temperature-sensitive products. Cold storage areas have slip hazards and limited visibility. Chemical segregation must be maintained in receiving areas. Chain of custody for biological samples and GMP materials must be documented.",
    overview: "Covers storage, material handling, housekeeping, traffic management, loading dock procedures, pedestrian safety, and injury prevention in warehouse environments.",
    requirements: [
      "Aisles and passageways clear and marked (≥ 3 ft wide for pedestrians)",
      "Storage limits and weight capacities posted for floors, shelves, and racks",
      "Materials stored safely — no top-heavy stacks, secured from falling",
      "Pedestrian/forklift traffic separation in forklift operating areas",
      "Loading dock safety: dock plates/boards, wheel chocks, trailer restraints",
      "Good housekeeping: no clutter, slip/trip hazards addressed promptly",
      "Emergency egress: exit paths clear, exit signs illuminated"
    ],
    checklist: [
      { id: "ws1", label: "Aisles clearly marked, unobstructed, and minimum 3 ft wide for foot traffic" },
      { id: "ws2", label: "Storage height and weight limits posted and observed" },
      { id: "ws3", label: "Materials properly stacked — no leaning, no top-heavy configurations" },
      { id: "ws4", label: "Pedestrian/vehicle separation maintained (barriers, mirrors, speed bumps)" },
      { id: "ws5", label: "Loading dock equipped with wheel chocks, dock plates, and trailer restraints" },
      { id: "ws6", label: "Housekeeping maintained — no liquid spills, trip hazards, or debris" },
      { id: "ws7", label: "Emergency exits clear and illuminated" },
      { id: "ws8", label: "Chemical storage in warehouse segregated and labeled" },
    ],
    inspectionHref: "/inspections?program=warehouse-safety",
  },

  {
    id: "forklift",
    title: "Forklift / PIT Program",
    subtitle: "Powered Industrial Truck",
    group: "warehouse",
    groupLabel: "Warehouse & Material Handling",
    regulation: "OSHA 29 CFR 1910.178",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3668", "ANSI/ITSDF B56.1"],
    frequency: "Annual",
    owner: "Warehouse Manager / EHS Manager",
    biotechNote: "Biotech receiving and warehouse operations often use sit-down counterbalanced forklifts, pallet jacks, and reach trucks. Cold storage forklifts require operator training specific to low-visibility, slippery-floor conditions. Operators must be recertified every 3 years or after incidents.",
    overview: "Requires written PIT program covering operator evaluation and training, equipment pre-shift inspection, safe operating procedures, pedestrian awareness, and specific conditions for each forklift type on site.",
    requirements: [
      "Written Powered Industrial Truck program",
      "Operator evaluation and training for each PIT type before first use",
      "Operator recertification every 3 years (or after incident/unsafe operation)",
      "Pre-shift inspection using equipment-specific checklist",
      "PIT tagged out and removed from service if defects found",
      "Speed limits and travel procedures established for facility",
      "Pedestrian awareness training for employees in forklift operating areas",
      "Refueling / battery charging procedures and designated areas"
    ],
    checklist: [
      { id: "fl1", label: "Operator training records current for all PIT operators (initial + 3-yr recert)" },
      { id: "fl2", label: "Operator authorization list current for each PIT type on site" },
      { id: "fl3", label: "Pre-shift inspection checklists completed daily for each unit" },
      { id: "fl4", label: "Any defective PIT tagged out and not operated" },
      { id: "fl5", label: "Speed limits and travel rules posted and enforced" },
      { id: "fl6", label: "Pedestrian/forklift separation maintained and all employees in area aware" },
      { id: "fl7", label: "Refueling/charging area designated, ventilated, and properly equipped" },
      { id: "fl8", label: "Annual formal evaluation of each operator on each type of PIT" },
    ],
    inspectionHref: "/inspections?program=forklift",
  },

  {
    id: "rack-inspections",
    title: "Rack Inspections",
    group: "warehouse",
    groupLabel: "Warehouse & Material Handling",
    regulation: "OSHA 29 CFR 1910.176 (General Duty Clause for storage); ANSI MH16.1",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3273", "RMI (Rack Manufacturers Institute) standards"],
    frequency: "Monthly",
    owner: "Warehouse Manager / EHS Manager",
    biotechNote: "Pallet rack damage is common in biotech receiving and storage areas due to forklift strikes. Damaged rack must be removed from service immediately — partial loading while damaged is prohibited. Seismic anchoring is required for pallet racking in California.",
    overview: "Regular inspection of pallet racking, shelving, and storage systems to identify structural damage, overloading, and missing components. Damaged racks must be immediately unloaded and either repaired by qualified personnel or replaced.",
    requirements: [
      "Rack inventory with load capacity postings on all pallet racking",
      "Monthly rack inspection by trained inspector",
      "Annual rack inspection by qualified rack engineer or manufacturer",
      "Damage criteria defined and communicated (when to remove from service)",
      "Damaged rack immediately unloaded, secured, and tagged out",
      "Repair-or-replace decision made by qualified person",
      "Seismic anchorage verified (California requirement)",
      "Rack inspection log maintained"
    ],
    checklist: [
      { id: "ri1", label: "Load capacity placard posted on each rack row (visible, legible)" },
      { id: "ri2", label: "Monthly rack inspection completed and documented" },
      { id: "ri3", label: "No column damage, bent uprights, or missing base plates observed" },
      { id: "ri4", label: "No beam deflection, hook damage, or missing safety pins observed" },
      { id: "ri5", label: "No overloading — actual loads within posted capacity" },
      { id: "ri6", label: "Damaged rack sections tagged out, unloaded, and repair initiated" },
      { id: "ri7", label: "Seismic anchor bolts present and intact at all rack bases" },
      { id: "ri8", label: "Floor anchors for all rack runs inspected (annual)" },
    ],
    inspectionHref: "/inspections?program=rack-inspections",
  },

  // ── Environmental & Regulatory ────────────────────────────────────────────

  {
    id: "waste-management",
    title: "Waste Management",
    group: "environmental",
    groupLabel: "Environmental & Regulatory",
    regulation: "EPA RCRA 40 CFR 260–270; California HSC 25100–25250 (DTSC)",
    additionalRegs: ["Cal/OSHA BBP §5193", "DOT 49 CFR 173 (shipping)", "NIH/CDC for biological waste"],
    frequency: "Quarterly",
    owner: "EHS Manager",
    biotechNote: "Biotech waste streams are complex: biohazardous (regulated medical) waste, chemical hazardous waste, universal waste (batteries, fluorescent lamps), radioactive waste (if applicable), and mixed waste. California is a RCRA-authorized state with stricter standards. Small Quantity Generators (SQG) and Large Quantity Generators (LQG) have different compliance obligations.",
    overview: "Comprehensive program for identification, segregation, packaging, labeling, storage, and disposal of all hazardous, biohazardous, chemical, and universal waste generated at the facility in compliance with EPA RCRA, California DTSC, and local regulations.",
    requirements: [
      "Waste generator status determined (VSQG, SQG, or LQG) and EPA ID obtained",
      "Hazardous waste accumulation areas established and labeled",
      "Satellite accumulation areas (SAAs) at point of generation compliant",
      "Biological/regulated medical waste segregated and properly packaged",
      "Manifested waste shipped with licensed transporters to permitted TSDFs",
      "Universal waste properly managed and disposed",
      "Annual waste summary and reporting as required",
      "Employee training on waste identification, segregation, and handling"
    ],
    checklist: [
      { id: "wm1", label: "EPA Hazardous Waste Generator ID number obtained and current" },
      { id: "wm2", label: "Waste generator status (VSQG/SQG/LQG) reviewed annually or when waste increases" },
      { id: "wm3", label: "Hazardous waste accumulation areas properly labeled and organized" },
      { id: "wm4", label: "Satellite accumulation areas (SAAs) within limits and at point of generation" },
      { id: "wm5", label: "Biological waste in rigid, leak-proof, labeled containers (red bag or sharps)" },
      { id: "wm6", label: "Waste manifests retained for 3 years; land disposal restrictions documented" },
      { id: "wm7", label: "Universal waste (batteries, lamps) labeled and disposed within 1 year" },
      { id: "wm8", label: "All employees generating hazardous waste trained annually" },
      { id: "wm9", label: "Waste disposal vendor TSDF permit verified annually" },
    ],
    inspectionHref: "/inspections?program=waste-management",
  },

  {
    id: "stormwater",
    title: "Stormwater",
    subtitle: "SWPPP Compliance",
    group: "environmental",
    groupLabel: "Environmental & Regulatory",
    regulation: "EPA Clean Water Act §402 (NPDES); California General Permit (Order 2022-0057-DWQ)",
    additionalRegs: ["Local Municipal NPDES Permit", "Porter-Cologne Water Quality Control Act"],
    frequency: "Quarterly",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech facilities generating industrial stormwater discharge must have a Stormwater Pollution Prevention Plan (SWPPP) and file a Notice of Intent (NOI). Chemical storage areas, loading docks, and waste accumulation areas are high-risk for stormwater contamination. Annual reports (Annual Report Form — ARF) are due July 1.",
    overview: "Compliance with the NPDES industrial stormwater permit requires a written SWPPP, implementation of Best Management Practices (BMPs), visual monitoring of discharge points, sampling (if triggered), corrective actions for exceedances, and annual reporting.",
    requirements: [
      "Stormwater Pollution Prevention Plan (SWPPP) current and site-specific",
      "Notice of Intent (NOI) filed with State Water Board (if industrial stormwater discharger)",
      "Best Management Practices (BMPs) implemented and maintained",
      "Quarterly visual monitoring of stormwater discharge points",
      "Sampling conducted if required by permit or triggered by visual exceedance",
      "Annual Report Form (ARF) submitted by July 1",
      "Corrective Action Reports filed within 72 hours of exceedance",
      "SWPPP training for all employees who work outdoors or in areas with exposure potential"
    ],
    checklist: [
      { id: "sw1", label: "SWPPP current, site-specific, and accessible on site during inspections" },
      { id: "sw2", label: "NOI filing status current (no permit lapses)" },
      { id: "sw3", label: "Quarterly visual monitoring completed and documented for all discharge points" },
      { id: "sw4", label: "BMPs maintained: berms, covers, drip trays, spill kits at loading dock" },
      { id: "sw5", label: "No outdoor chemical or waste storage without secondary containment" },
      { id: "sw6", label: "Annual Report Form (ARF) submitted by July 1 deadline" },
      { id: "sw7", label: "SWPPP team members trained and current" },
      { id: "sw8", label: "No unauthorized discharges — spill logs reviewed" },
    ],
    inspectionHref: "/inspections?program=stormwater",
  },

  {
    id: "air-quality",
    title: "Air Quality",
    group: "environmental",
    groupLabel: "Environmental & Regulatory",
    regulation: "Clean Air Act (42 USC 7401); California HSC §42300 (CARB/local Air Districts)",
    additionalRegs: ["South Coast AQMD Rule 1401", "Bay Area AQMD Regulation 2", "Cal EPA Title 17"],
    frequency: "Annual",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech air quality permits typically cover boilers, emergency generators, fume hood exhaust, bioreactor off-gas, solvent use, and chemical storage tank vents. Biotech solvent use (methanol, ethanol, acetonitrile) may trigger VOC permit thresholds. California air districts are strict — permit violations carry significant fines.",
    overview: "Management of all permitted air emission sources including permit compliance, operational limits, recordkeeping, stack testing, and reporting to the local air quality management district (AQMD) or Air Resources Board (CARB).",
    requirements: [
      "Air Permit to Operate (PTO) current for all regulated emission sources",
      "Operational logs for all permitted equipment (run hours, fuel use, maintenance)",
      "Emissions calculations and compliance demonstration records",
      "Stack testing conducted per permit schedule",
      "Annual emission inventory reported to local AQMD",
      "Permit conditions reviewed and communicated to operations staff",
      "New source review (NSR) triggered for significant new emission sources"
    ],
    checklist: [
      { id: "aq1", label: "Permit to Operate (PTO) current for all emission sources (boilers, generators, processes)" },
      { id: "aq2", label: "Operational logs maintained per permit requirements" },
      { id: "aq3", label: "Permitted equipment within operational limits (hours, throughput, fuel use)" },
      { id: "aq4", label: "Stack test results on file and within permit limits" },
      { id: "aq5", label: "Annual emission inventory filed with local air district" },
      { id: "aq6", label: "Emergency generator maintenance log and test run records current" },
      { id: "aq7", label: "No permit modifications needed for operational changes (reviewed annually)" },
    ],
    inspectionHref: "/inspections?program=air-quality",
  },

  {
    id: "regulatory-permits",
    title: "Regulatory Permits",
    group: "environmental",
    groupLabel: "Environmental & Regulatory",
    regulation: "California HSC §25505 (HMBP); Cal Fire Title 19; Local Building/Fire Codes",
    additionalRegs: ["EPA EPCRA §312 (Tier II)", "DEA (if controlled substances)", "NRC (if radioactive materials)"],
    frequency: "Annual",
    owner: "EHS Manager / Facilities / Regulatory Affairs",
    biotechNote: "Biotech facilities typically hold: CUPA HMMP/HMBP permits, fire department hazmat storage permits, local business/operation permits, air permits, DEA Schedule I-V registration (if applicable), and CDC/USDA select agent registration (if applicable). All permits must be renewed on schedule — expired permits can trigger facility shutdown.",
    overview: "Centralized tracking of all environmental health and safety operating permits, licenses, and registrations with their renewal dates, responsible parties, and compliance conditions.",
    requirements: [
      "Hazardous Materials Business Plan (HMBP) filed with CUPA (California)",
      "Fire department hazmat storage permit current",
      "Local business/operation license current",
      "Air Permit to Operate current (if applicable)",
      "Wastewater discharge permit current (if industrial discharge)",
      "DEA Schedule registration current (if controlled substances)",
      "Select agent registration current (CDC/USDA, if applicable)",
      "Permit inventory/calendar maintained with renewal dates"
    ],
    checklist: [
      { id: "rp1", label: "HMBP filed and current with CUPA (annual update if changes)" },
      { id: "rp2", label: "Fire department hazmat permit current (check expiration date)" },
      { id: "rp3", label: "Local business license / operation permit current" },
      { id: "rp4", label: "Air Permit to Operate current for all regulated emission sources" },
      { id: "rp5", label: "Wastewater discharge permit current and discharge within limits" },
      { id: "rp6", label: "DEA registration current (if DEA-scheduled substances in use)" },
      { id: "rp7", label: "Select agent registration in compliance (if select agents on site)" },
      { id: "rp8", label: "Permit renewal calendar maintained — no permits expired or lapsing" },
    ],
    inspectionHref: "/inspections?program=regulatory-permits",
  },

  {
    id: "work-permits",
    title: "Work Permits",
    subtitle: "Hot Work, Confined Space, Elevated Work",
    group: "environmental",
    groupLabel: "Environmental & Regulatory",
    regulation: "OSHA 29 CFR 1910.146 (Confined Space); 29 CFR 1910.252 (Hot Work)",
    additionalRegs: ["Cal/OSHA CCR Title 8 §5157 (Confined Space)", "NFPA 51B (Hot Work)", "Cal Fire §2780"],
    frequency: "Per-Event",
    owner: "EHS Manager / Facilities",
    biotechNote: "Biotech facilities have confined space hazards in mechanical rooms, pits, tanks, and crawlspaces. Hot work is especially hazardous near solvent storage or in cleanrooms. BSL-3 facilities with negative-pressure HVAC require special precautions for any work that could disrupt containment.",
    overview: "Permit-to-work systems for hot work (welding, cutting, grinding), permit-required confined space entry, and other high-hazard activities requiring formal authorization, pre-work hazard assessment, monitoring, and rescue capability.",
    requirements: [
      "Confined Space inventory: all spaces evaluated for permit-required status",
      "Written PRCS program with entry procedures, training, and rescue plan",
      "Confined Space permits issued for each entry with atmospheric monitoring",
      "Hot Work Permit program with fire watch procedures",
      "Hot work permit area inspected before and after work",
      "Fire watch maintained during and 30–60 min after hot work",
      "Contractor work permit coordination procedures"
    ],
    checklist: [
      { id: "wp1", label: "Confined space inventory current (all spaces evaluated as PRCS or Non-PRCS)" },
      { id: "wp2", label: "Written PRCS program with entry procedures and rescue plan" },
      { id: "wp3", label: "Entry supervisors, attendants, and entrants trained and listed" },
      { id: "wp4", label: "Atmospheric monitoring equipment calibrated and available" },
      { id: "wp5", label: "Hot work permit system in place (form, authorization, fire watch)" },
      { id: "wp6", label: "Hot work area inspected for combustibles before permit issued" },
      { id: "wp7", label: "Fire watch remains 30–60 min after hot work completion" },
      { id: "wp8", label: "Contractor permit coordination procedure documented" },
    ],
    inspectionHref: "/inspections?program=work-permits",
  },

  {
    id: "injury-investigation",
    title: "Injury Investigation",
    group: "environmental",
    groupLabel: "Environmental & Regulatory",
    regulation: "29 CFR 1904 (OSHA Recordkeeping); Cal/OSHA CCR Title 8 §342",
    additionalRegs: ["Cal/OSHA CCR Title 8 §3203 (IIPP investigation requirement)"],
    frequency: "Per-Event",
    owner: "EHS Manager / Supervisor",
    biotechNote: "Biotech injury investigations must assess exposure potential (chemical, biological, radiological) in addition to physical injury. Needlestick and sharps injuries require immediate post-exposure evaluation. All near-misses must be investigated — early intervention prevents recordable injuries.",
    overview: "Systematic process to investigate all workplace injuries, illnesses, near-misses, and property damage incidents to determine root cause, implement corrective actions, and prevent recurrence.",
    requirements: [
      "Investigation initiated within 24 hours of incident notification",
      "Investigation team includes supervisor, EHS, and employee representative",
      "Root cause analysis (not just immediate cause) documented",
      "Corrective actions assigned with owners and due dates",
      "OSHA recordability determination made within 7 days",
      "OSHA 300 log updated; Form 301 completed",
      "Corrective action follow-up and closure verification",
      "Trend analysis conducted quarterly"
    ],
    checklist: [
      { id: "ii1", label: "Incident reporting system accessible to all employees (hotline, form, app)" },
      { id: "ii2", label: "Investigation process documented — supervisor training on incident investigation" },
      { id: "ii3", label: "Root cause analysis tool in use (5-Whys, Fishbone, TapRoot)" },
      { id: "ii4", label: "All recordable incidents investigated and CAPA completed" },
      { id: "ii5", label: "OSHA 300 log updated within 7 days of each recordable incident" },
      { id: "ii6", label: "Near-miss investigations conducted and findings communicated to team" },
      { id: "ii7", label: "Corrective actions tracked to closure with verification" },
      { id: "ii8", label: "Quarterly injury trend review by EHS and leadership" },
    ],
    relatedHref: "/operations/capa",
    relatedLabel: "Open CAPA",
    inspectionHref: "/inspections?program=injury-investigation",
  },
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function getProgramById(id: string): ProgramData | undefined {
  return programData.find((p) => p.id === id);
}

export function getProgramsByGroup(): Map<string, ProgramData[]> {
  const map = new Map<string, ProgramData[]>();
  for (const p of programData) {
    const list = map.get(p.group) ?? [];
    list.push(p);
    map.set(p.group, list);
  }
  return map;
}

export const frequencyBadge: Record<ProgramFrequency, { label: string; className: string }> = {
  Annual:    { label: "Annual", className: "status-needs-review" },
  Quarterly: { label: "Quarterly", className: "status-needs-review" },
  Monthly:   { label: "Monthly", className: "status-needs-review" },
  Ongoing:   { label: "Ongoing", className: "status-current" },
  "Per-Event": { label: "Per-Event", className: "" },
};
