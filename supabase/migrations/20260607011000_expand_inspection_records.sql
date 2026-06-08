-- Manual v1.1 alignment — inspection risk classification + register linkage.
alter table public.inspection_records add column if not exists risk_classification text;
alter table public.inspection_records add column if not exists trend_category text;
alter table public.inspection_records add column if not exists linked_risk_register_id uuid references public.risk_register_entries(id) on delete set null;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'inspection_risk_classification_chk') then
    alter table public.inspection_records add constraint inspection_risk_classification_chk
      check (risk_classification is null or risk_classification in ('low','medium','high','critical'));
  end if;
end $$;
