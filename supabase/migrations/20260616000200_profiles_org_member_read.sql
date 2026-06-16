-- The original profiles_select_same_org policy only allowed id = auth.uid(),
-- which means authenticated users could only read their own profile row.
-- This breaks any feature that needs to list org members (training matrix
-- employee tab, qualified persons, etc.).
-- Fix: allow reading profiles within the same organization.

drop policy if exists "profiles_select_same_org" on public.profiles;

create policy "profiles_select_same_org"
  on public.profiles for select
  using (
    id = auth.uid()
    or organization_id = (
      select organization_id from public.profiles where id = auth.uid()
    )
  );
