-- ============================================================================
-- Management Review & Action Items
-- Formal quarterly / annual review of the EHS management system.
-- Required under ISO 45001 Clause 9.3 and ICH Q10.
-- ============================================================================

create table if not exists public.management_reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  review_type text not null default 'quarterly'
    check (review_type in ('quarterly','annual','special')),
  review_date date not null,
  review_period_start date,
  review_period_end date,
  attendees text,
  agenda_summary text,
  status text not null default 'draft'
    check (status in ('draft','completed')),
  kpi_snapshot jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.management_review_action_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.management_reviews(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  description text not null,
  owner_role text,
  due_date date,
  status text not null default 'open'
    check (status in ('open','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists management_reviews_org_idx        on public.management_reviews(organization_id);
create index if not exists mgmt_review_actions_org_idx       on public.management_review_action_items(organization_id);
create index if not exists mgmt_review_actions_review_idx    on public.management_review_action_items(review_id);

grant select, insert, update, delete on public.management_reviews             to authenticated;
grant select, insert, update, delete on public.management_review_action_items to authenticated;

alter table public.management_reviews             enable row level security;
alter table public.management_review_action_items enable row level security;

create policy "management_reviews_member_all"
  on public.management_reviews for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));

create policy "mgmt_review_actions_member_all"
  on public.management_review_action_items for all to authenticated
  using (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ))
  with check (organization_id in (
    select organization_id from public.profiles where profiles.id = (select auth.uid())
  ));
