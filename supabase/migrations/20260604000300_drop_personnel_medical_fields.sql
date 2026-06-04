-- De-clinicalize personnel records.
--
-- PredictSafeBIO is a biosafety / EHS platform. It must not store employee
-- health information. The patient_bios table inherited clinical columns from an
-- earlier healthcare product; these were collected and displayed but never
-- consumed by risk scoring or any other logic.
--
-- This migration permanently drops those columns. Data in them is destroyed.
-- The table is retained as a minimal personnel roster (display_name + lifecycle
-- fields only). A future migration may rename patient_bios -> personnel_records.

alter table public.patient_bios
  drop column if exists date_of_birth_year,
  drop column if exists biological_sex,
  drop column if exists conditions,
  drop column if exists allergies;
