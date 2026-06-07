-- ============================================================================
-- Manual v1.1 alignment — Management of Change records (§9 / Appendix I)
-- ============================================================================
create table if not exists public.management_of_change_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  change_type text check (change_type in ('material','process','equipment','location','scale','product','work_method','facility','supplier','organization')),
  change_description text,
  affected_programs text[] not null default '{}',
  specialized_screen_flags text[] not null default '{}',
  new_hazards text,
  changed_controls text,
  residual_risk text,
  status text not null default 'draft'
    check (status in ('draft','in_review','approved','approved_with_restrictions','rejected')),
  routing_required text[] not null default '{}',
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz,
  final_reviewer_id uuid references public.profiles(id) on delete set null,
  decision_at timestamptz,
  decision_rationale text,
  post_change_review_due date,
  revalidation_required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists moc_org_idx on public.management_of_change_records(organization_id);
create index if not exists moc_org_status_idx on public.management_of_change_records(organization_id, status);

grant select, insert, update, delete on public.management_of_change_records to authenticated;
alter table public.management_of_change_records enable row level security;

create policy "moc_member_all"
  on public.management_of_change_records for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
