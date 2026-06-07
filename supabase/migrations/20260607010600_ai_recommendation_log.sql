-- ============================================================================
-- Manual v1.1 alignment — AI Recommendation Log (§11 guardrails)
-- Audit trail for every AI output: inputs cited, confidence, human decision.
-- ============================================================================
create table if not exists public.ai_recommendation_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  source_table text,
  source_record_id uuid,
  recommendation_text text,
  inputs_cited jsonb not null default '{}'::jsonb,
  confidence_score numeric check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 1)),
  status text not null default 'draft' check (status in ('draft','accepted','rejected','modified')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reviewer_rationale text,
  final_action_taken text,
  outcome_calibration_note text,
  created_at timestamptz not null default now()
);

create index if not exists airl_org_idx on public.ai_recommendation_log(organization_id);
create index if not exists airl_org_status_idx on public.ai_recommendation_log(organization_id, status);

grant select, insert, update, delete on public.ai_recommendation_log to authenticated;
alter table public.ai_recommendation_log enable row level security;

create policy "airl_member_all"
  on public.ai_recommendation_log for all to authenticated
  using (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())))
  with check (organization_id in (select organization_id from public.profiles where profiles.id = (select auth.uid())));
