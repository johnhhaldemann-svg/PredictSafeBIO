-- Rename patient_bios → personnel_records
-- PredictSafeBIO is a biosafety/EHS platform; "patient_bios" was inherited
-- from a clinical product template. The table stores org personnel display
-- names for RLS scoping — no health data. Renaming to reflect actual purpose.

ALTER TABLE public.patient_bios RENAME TO personnel_records;

-- Rename RLS policies to match new table name
ALTER POLICY "patient_bios_select"
  ON public.personnel_records
  RENAME TO "personnel_records_select";

ALTER POLICY "patient_bios_provider_insert"
  ON public.personnel_records
  RENAME TO "personnel_records_provider_insert";

ALTER POLICY "patient_bios_provider_update"
  ON public.personnel_records
  RENAME TO "personnel_records_provider_update";

ALTER POLICY "patient_bios_admin_delete"
  ON public.personnel_records
  RENAME TO "personnel_records_admin_delete";
