-- ============================================================================
-- Manual v1.1 alignment — expand compliance_programs (§5) + global program_catalog (§8)
-- compliance_programs is org-scoped (unique(organization_id, program_name)), so the
-- 60+ module library lives in a global reference table the applicability engine
-- instantiates from. Additive only; no existing column changed.
-- ============================================================================
alter table public.compliance_programs add column if not exists activation_trigger text;
alter table public.compliance_programs add column if not exists disabled_rationale text;
alter table public.compliance_programs add column if not exists requires_qualified_review boolean not null default true;

create table if not exists public.program_catalog (
  id uuid primary key default gen_random_uuid(),
  program_name text not null unique,
  layer text,                       -- foundation/core/lab_bio/specialized/operations/intelligence
  activation_trigger text,          -- maps to a setup-questionnaire concept
  minimum_output text,
  default_frequency text,
  requires_qualified_review boolean not null default true,
  regulatory_basis text,
  created_at timestamptz not null default now()
);

grant select on public.program_catalog to authenticated;
alter table public.program_catalog enable row level security;
create policy "program_catalog_read_all"
  on public.program_catalog for select to authenticated using (true);

insert into public.program_catalog (program_name, layer, activation_trigger, default_frequency, requires_qualified_review) values
  ('General Workplace Safety','core','all_clients','annual',false),
  ('HazCom / Chemical Management','core','chemicals_present','annual',false),
  ('Chemical Hygiene','lab_bio','lab_chemicals','annual',true),
  ('Chemical Approval','lab_bio','new_chemical','before_use',true),
  ('Aging / Unstable Chemicals','lab_bio','reactive_time_sensitive_chemicals','monthly',true),
  ('IDLH / High-Risk Exposure','specialized','toxic_atmosphere','per_change',true),
  ('PPE','core','task_hazards','annual',false),
  ('Respiratory Protection','core','respirator_use','annual',true),
  ('Biosafety','lab_bio','biological_materials','annual',true),
  ('Bloodborne Pathogens','lab_bio','human_blood_opim','annual',true),
  ('IBC / Recombinant or Synthetic Nucleic Acids','lab_bio','recombinant_synthetic_na','quarterly',true),
  ('Biological Material Review','lab_bio','new_biological_material','per_change',true),
  ('BSC Register','lab_bio','biosafety_cabinets','annual',true),
  ('Fume Hood Register','lab_bio','fume_hoods','annual',false),
  ('Autoclave / Decontamination','lab_bio','autoclaves','annual',false),
  ('Waste Management','operations','regulated_waste','weekly',true),
  ('Biohazard / Sharps Waste','lab_bio','sharps_biohazard_waste','weekly',false),
  ('Radiation Safety','specialized','radioactive_material','annual',true),
  ('Laser Safety','specialized','lasers','annual',true),
  ('Compressed Gas','operations','compressed_gas','quarterly',false),
  ('Cryogens','operations','cryogens','quarterly',true),
  ('Cold Chain / Critical Storage','specialized','cold_chain','daily',true),
  ('Equipment & Engineering Controls','operations','critical_equipment','per_change',false),
  ('Machine Guarding','operations','manufacturing_equipment','annual',false),
  ('Electrical Safety','operations','electrical_equipment','annual',true),
  ('LOTO','operations','hazardous_energy_service','annual',true),
  ('Work Permits','operations','high_hazard_tasks','before_use',true),
  ('Confined Space','operations','confined_spaces','before_use',true),
  ('Hot Work','operations','hot_work','before_use',true),
  ('Process Safety / PSM-RMP Screen','specialized','highly_hazardous_chemicals','per_change',true),
  ('Emergency Action','core','all_facilities','annual',false),
  ('Spill Response','core','spill_risk','annual',false),
  ('Fire & Life Safety','core','all_facilities','monthly',false),
  ('Incident / Near Miss','core','all_clients','event_triggered',false),
  ('CAPA','core','all_clients','event_triggered',true),
  ('Training & Competency','core','all_role_based_work','annual',false),
  ('Qualified Person Registry','foundation','tasks_needing_approval','annual',true),
  ('Committee Management','foundation','governance_by_risk','quarterly',true),
  ('Cleanroom / Controlled Environment','operations','cleanrooms','daily',true),
  ('Medical Device / Labware','operations','device_labware','per_change',true),
  ('Pharma/Biologics Manufacturing','operations','drug_biologic_manufacturing','per_batch',true),
  ('GxP / Part 11 / Data Integrity','specialized','gxp_part11_records','per_change',true),
  ('Diagnostic Lab / CLIA / HIPAA','specialized','human_specimen_testing','per_change',true),
  ('HPAPI / Hazardous Drug','specialized','potent_compounds','per_change',true),
  ('Instrument Manufacturing / Service','operations','instrument_manufacturing','per_change',true),
  ('Warehouse / Material Handling','operations','forklifts_racking','daily',false),
  ('Ergonomics','core','strain_risk_tasks','annual',false),
  ('Pest & Disinfection','operations','labs_cleanrooms_storage','monthly',false),
  ('Contractor / Vendor Compliance','operations','contractors_vendors','per_change',false),
  ('Environmental Compliance','operations','environmental_permits','quarterly',true),
  ('Shipping / Transportation','operations','regulated_shipping','per_change',true),
  ('Animal Research / Vivarium','specialized','animals_vivarium','quarterly',true),
  ('Select Agents / Biosecurity','specialized','select_agents','quarterly',true),
  ('Controlled Substances','specialized','dea_controlled','monthly',true),
  ('Security / Access Control','operations','restricted_areas','quarterly',true),
  ('Document Control','foundation','sops_records','per_change',false),
  ('Audit Readiness','intelligence','all_clients','quarterly',true),
  ('Predictive Risk Dashboard','intelligence','all_active_data','annual',false),
  ('Management Review','intelligence','all_clients','quarterly',true)
on conflict (program_name) do nothing;
