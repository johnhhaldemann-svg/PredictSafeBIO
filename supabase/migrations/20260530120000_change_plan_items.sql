create table public.change_plan_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  category text not null,
  feature text not null,
  owner text not null,
  priority text not null default 'Medium' check (priority in ('High', 'Medium', 'Low')),
  status text not null default 'Planned' check (status in ('Planned', 'In discovery', 'Ready for demo', 'Backlog')),
  notes text not null default '',
  href text not null default '/change-plan',
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index change_plan_items_org_sort_idx on public.change_plan_items(organization_id, sort_order, created_at desc);
create index change_plan_items_org_status_idx on public.change_plan_items(organization_id, status, priority);
create index change_plan_items_created_by_idx on public.change_plan_items(created_by);

grant select, insert, update, delete on public.change_plan_items to authenticated;

alter table public.change_plan_items enable row level security;

create policy "change_plan_items_member_select"
  on public.change_plan_items for select to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "change_plan_items_owner_insert"
  on public.change_plan_items for insert to authenticated
  with check (
    organization_id in (
      select organization_id
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'owner'
    )
    and created_by = (select auth.uid())
  );

create policy "change_plan_items_owner_update"
  on public.change_plan_items for update to authenticated
  using (
    organization_id in (
      select organization_id
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'owner'
    )
  )
  with check (
    organization_id in (
      select organization_id
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'owner'
    )
  );

create policy "change_plan_items_owner_delete"
  on public.change_plan_items for delete to authenticated
  using (
    organization_id in (
      select organization_id
      from public.profiles
      where profiles.id = (select auth.uid())
        and profiles.role = 'owner'
    )
  );
