-- AI Knowledge Review System
-- Captures every knowledge payload submitted to the Safety Engine so that
-- workspace owners and staff can approve, flag, or reject it before it
-- influences risk scores or recommendations.
--
-- knowledge_type vocabulary mirrors BioSourceModule where possible.
-- review_status workflow: pending → approved | flagged | rejected
-- quality_classification is set by the reviewer to distinguish real
-- domain knowledge from junk, test data, or accidental submissions.

create table public.ai_knowledge_entries (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,

  -- What kind of knowledge this is
  knowledge_type        text not null
                          check (knowledge_type in (
                            'assessment_input',
                            'risk_signal',
                            'foundation_context',
                            'applicability_rule',
                            'biotype_context',
                            'reference_rule',
                            'change_impact',
                            'evidence_map',
                            'ergonomic_assessment'
                          )),

  -- Source tracing back to the module/record that produced this knowledge
  source_module         text,
  source_record_id      text,

  -- Human-readable label and summary of the knowledge content
  label                 text not null,
  content_summary       text not null,

  -- Full JSON payload for detailed review
  content_json          jsonb not null default '{}'::jsonb,

  -- Risk level the AI engine assigned from this input
  ai_risk_level         text check (ai_risk_level in ('low', 'moderate', 'high', 'critical')),
  ai_confidence         text check (ai_confidence in ('low', 'medium', 'high')),
  ai_human_review_required boolean not null default false,

  -- Submission metadata
  submitted_by          uuid references auth.users(id) on delete set null,
  submitted_at          timestamptz not null default now(),

  -- Review state
  review_status         text not null default 'pending'
                          check (review_status in ('pending', 'approved', 'flagged', 'rejected')),
  reviewed_by           uuid references auth.users(id) on delete set null,
  reviewed_at           timestamptz,
  review_notes          text,

  -- Quality verdict set by the reviewer
  quality_classification text check (quality_classification in (
                            'validated_knowledge',
                            'reasonable_knowledge',
                            'low_quality',
                            'junk'
                          )),

  -- Whether this entry has been excluded from future AI scoring
  excluded_from_engine  boolean not null default false,

  -- Soft-delete and timestamps
  deleted_at            timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Indexes for common query patterns
create index ai_knowledge_entries_org_status_idx
  on public.ai_knowledge_entries(organization_id, review_status, created_at desc)
  where deleted_at is null;

create index ai_knowledge_entries_org_type_idx
  on public.ai_knowledge_entries(organization_id, knowledge_type, created_at desc)
  where deleted_at is null;

create index ai_knowledge_entries_pending_idx
  on public.ai_knowledge_entries(organization_id, created_at desc)
  where review_status = 'pending' and deleted_at is null;

create index ai_knowledge_entries_submitted_by_idx
  on public.ai_knowledge_entries(submitted_by)
  where deleted_at is null;

-- Row-level security
alter table public.ai_knowledge_entries enable row level security;
grant select, insert, update on public.ai_knowledge_entries to authenticated;

-- All org members can view knowledge entries in their organization
create policy "ai_knowledge_entries_select_org"
  on public.ai_knowledge_entries for select
  using (
    deleted_at is null
    and organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

-- Any authenticated org member can submit a knowledge entry (the engine logs it)
create policy "ai_knowledge_entries_insert_org"
  on public.ai_knowledge_entries for insert
  with check (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
    )
  );

-- Only owners / admins can review (update review_status, quality_classification, etc.)
create policy "ai_knowledge_entries_update_owner"
  on public.ai_knowledge_entries for update
  using (
    organization_id in (
      select organization_id from public.profiles
      where profiles.id = (select auth.uid())
        and role in ('owner', 'company_admin', 'safety_manager')
    )
  );

-- Trigger to keep updated_at fresh
create or replace function public.set_ai_knowledge_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger ai_knowledge_entries_updated_at
  before update on public.ai_knowledge_entries
  for each row execute function public.set_ai_knowledge_updated_at();
