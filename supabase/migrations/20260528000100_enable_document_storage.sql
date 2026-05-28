insert into storage.buckets (id, name, public)
values ('biotech-documents', 'biotech-documents', false)
on conflict (id) do nothing;

create policy "biotech_documents_member_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'biotech-documents'
    and (storage.foldername(name))[1] in (
      select organization_id::text from public.profiles where profiles.id = auth.uid()
    )
  );

create policy "biotech_documents_member_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'biotech-documents'
    and (storage.foldername(name))[1] in (
      select organization_id::text from public.profiles where profiles.id = auth.uid()
    )
  );

create policy "biotech_documents_member_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'biotech-documents'
    and (storage.foldername(name))[1] in (
      select organization_id::text from public.profiles where profiles.id = auth.uid()
    )
  )
  with check (
    bucket_id = 'biotech-documents'
    and (storage.foldername(name))[1] in (
      select organization_id::text from public.profiles where profiles.id = auth.uid()
    )
  );

create policy "biotech_documents_member_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'biotech-documents'
    and (storage.foldername(name))[1] in (
      select organization_id::text from public.profiles where profiles.id = auth.uid()
    )
  );
