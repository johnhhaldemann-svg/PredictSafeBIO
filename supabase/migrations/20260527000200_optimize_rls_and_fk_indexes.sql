drop policy if exists "profiles_select_same_org" on public.profiles;
drop policy if exists "profiles_insert_self" on public.profiles;
drop policy if exists "profiles_update_self" on public.profiles;
drop policy if exists "organizations_select_member" on public.organizations;
drop policy if exists "company_profiles_member_all" on public.company_profiles;
drop policy if exists "assessments_member_all" on public.assessments;
drop policy if exists "assessment_signals_member_all" on public.assessment_signals;
drop policy if exists "document_metadata_member_all" on public.document_metadata;
drop policy if exists "document_recommendations_member_all" on public.document_recommendations;
drop policy if exists "audit_events_member_select" on public.audit_events;
drop policy if exists "audit_events_member_insert" on public.audit_events;

create index if not exists assessment_signals_organization_id_idx on public.assessment_signals(organization_id);
create index if not exists assessments_created_by_idx on public.assessments(created_by);
create index if not exists audit_events_actor_id_idx on public.audit_events(actor_id);
create index if not exists company_profiles_created_by_idx on public.company_profiles(created_by);
create index if not exists company_profiles_organization_id_idx on public.company_profiles(organization_id);
create index if not exists document_metadata_created_by_idx on public.document_metadata(created_by);
create index if not exists document_recommendations_created_by_idx on public.document_recommendations(created_by);
create index if not exists document_recommendations_organization_id_idx on public.document_recommendations(organization_id);

create policy "profiles_select_same_org"
  on public.profiles for select
  using (id = (select auth.uid()));

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = (select auth.uid()));

create policy "profiles_update_self"
  on public.profiles for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "organizations_select_member"
  on public.organizations for select
  using (id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "company_profiles_member_all"
  on public.company_profiles for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "assessments_member_all"
  on public.assessments for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "assessment_signals_member_all"
  on public.assessment_signals for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "document_metadata_member_all"
  on public.document_metadata for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "document_recommendations_member_all"
  on public.document_recommendations for all
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "audit_events_member_select"
  on public.audit_events for select
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));

create policy "audit_events_member_insert"
  on public.audit_events for insert
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
