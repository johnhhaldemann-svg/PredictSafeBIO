-- ============================================================================
-- Manual v1.1 alignment — Qualified Person Registry (§10)
-- Who is qualified to approve which task/decision types.
-- ============================================================================
create table if not exists public.qualified_person_registry (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_title text,
  qualified_for text[] not null default '{}',
  qualification_basis text,
  expiration_date date,
  active boolean not null default true,
  approved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists qpr_org_idx on public.qualified_person_registry(organization_id);
create index if not exists qpr_org_profile_idx on public.qualified_person_registry(organization_id, profile_id);

grant select, insert, update, delete on public.qualified_person_registry to authenticated;
alter table public.qualified_person_registry enable row level security;

create policy "qpr_member_all"
  on public.qualified_person_registry for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
