alter table public.assessments
  add column if not exists reviewer_notes text,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz;

alter table public.assessments
  drop constraint if exists assessments_human_review_status_check;

alter table public.assessments
  add constraint assessments_human_review_status_check
  check (
    human_review_status in (
      'draft_human_review_required',
      'in_review',
      'reviewed_needs_action',
      'reviewed_monitoring',
      'routine_monitoring'
    )
  );
