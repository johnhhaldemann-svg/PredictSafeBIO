-- Manual v1.1 alignment — CAPA effectiveness + root cause + interim control (§9).
alter table public.capa_records add column if not exists interim_control text;
alter table public.capa_records add column if not exists root_cause text;
alter table public.capa_records add column if not exists effectiveness_status text;
alter table public.capa_records add column if not exists effectiveness_checked_at timestamptz;
alter table public.capa_records add column if not exists recurrence_count integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'capa_effectiveness_status_chk') then
    alter table public.capa_records add constraint capa_effectiveness_status_chk
      check (effectiveness_status is null or effectiveness_status in ('pending','confirmed','failed'));
  end if;
end $$;
