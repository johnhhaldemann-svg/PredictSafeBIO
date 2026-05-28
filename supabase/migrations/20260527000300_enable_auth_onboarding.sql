grant insert, update on public.organizations to authenticated;
grant insert on public.profiles to authenticated;

create policy "organizations_insert_authenticated"
  on public.organizations for insert
  with check ((select auth.uid()) is not null);

create policy "organizations_update_member"
  on public.organizations for update
  using (id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
