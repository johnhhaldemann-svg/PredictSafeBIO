-- ============================================================================
-- Manual v1.1 alignment — Client Setup Questionnaire responses (Appendix A / §4)
-- Additive. Org-scoped, RLS mirrors existing domain tables (e.g. hazards).
-- NOTE: column is organization_id (codebase convention) not org_id.
-- Person FKs reference public.profiles(id) (profiles.id = auth.users.id).
-- ============================================================================
create table if not exists public.client_setup_questionnaire_responses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question_number integer not null,
  question_domain text,
  question_text text,
  answer text,
  answered_by uuid references public.profiles(id) on delete set null,
  answered_at timestamptz not null default now(),
  program_triggered text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, question_number)
);

create index if not exists csqr_org_idx on public.client_setup_questionnaire_responses(organization_id);

grant select, insert, update, delete on public.client_setup_questionnaire_responses to authenticated;
alter table public.client_setup_questionnaire_responses enable row level security;

create policy "csqr_member_all"
  on public.client_setup_questionnaire_responses for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
