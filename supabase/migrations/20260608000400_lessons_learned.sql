-- ============================================================================
-- Lessons Learned Registry
-- Structured knowledge capture from incidents, CAPAs, audits, and near misses.
-- Implements the PDCA close-loop mechanism per ICH Q10 §2.7 and ISO 45001.
-- ============================================================================

create table if not exists public.lessons_learned (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  description text not null,
  source_type text not null default 'other'
    check (source_type in (
      'incident','capa','inspection','audit','near_miss','external','other'
    )),
  source_id text,
  phase text not null default 'operate'
    check (phase in ('assess','plan','operate','monitor')),
  hazard_type text,
  program_tags text[],
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);

create index if not exists lessons_learned_org_idx    on public.lessons_learned(organization_id);
create index if not exists lessons_learned_status_idx on public.lessons_learned(status);
create index if not exists lessons_learned_phase_idx  on public.lessons_learned(phase);

grant select, insert, update, delete on public.lessons_learned to authenticated;

alter table public.lessons_learned enable row level security;

create policy "lessons_learned_member_all"
  on public.lessons_learned for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));
