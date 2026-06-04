create table public.audit_readiness_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  audit_readiness_score_id uuid references public.audit_readiness_scores(id) on delete cascade,
  note text not null,
  note_type text not null default 'human_review_note',
  draft_only boolean not null default true,
  human_review_required boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index audit_readiness_notes_org_created_at_idx on public.audit_readiness_notes(organization_id, created_at desc);
create index audit_readiness_notes_score_idx on public.audit_readiness_notes(audit_readiness_score_id, created_at desc);
create index audit_readiness_notes_created_by_idx on public.audit_readiness_notes(created_by);

grant select, insert, update, delete on public.audit_readiness_notes to authenticated;

alter table public.audit_readiness_notes enable row level security;

create policy "audit_readiness_notes_member_all"
  on public.audit_readiness_notes for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
