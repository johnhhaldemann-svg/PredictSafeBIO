-- Manual v1.1 alignment — link risk_cells to the risk register + program + confidence.
alter table public.risk_cells add column if not exists risk_register_entry_id uuid references public.risk_register_entries(id) on delete set null;
alter table public.risk_cells add column if not exists program_name text;
alter table public.risk_cells add column if not exists confidence numeric;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'risk_cells_confidence_range') then
    alter table public.risk_cells add constraint risk_cells_confidence_range
      check (confidence is null or (confidence >= 0 and confidence <= 1));
  end if;
end $$;
create index if not exists risk_cells_rre_idx on public.risk_cells(risk_register_entry_id) where risk_register_entry_id is not null;
