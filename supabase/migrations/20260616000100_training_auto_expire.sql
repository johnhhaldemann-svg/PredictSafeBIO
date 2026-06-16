-- Auto-expire completed training assignments when expires_at has passed,
-- then re-enroll employees into a fresh "assigned" cycle if the requirement
-- has a recurrence frequency set.
--
-- Runs daily at 02:00 UTC via pg_cron (enabled by default in Supabase).

-- Step 1: flip completed → expired when expires_at is in the past
select cron.schedule(
  'expire-completed-training-assignments',
  '0 2 * * *',
  $$
    update public.training_assignments
    set
      status     = 'expired',
      updated_at = now()
    where status     = 'completed'
      and expires_at is not null
      and expires_at < now();
  $$
);

-- Step 2: re-enroll employees whose training is now expired and whose
-- requirement specifies a recurrence frequency, provided they don't already
-- have an active "assigned" record for that requirement.
select cron.schedule(
  'reenroll-expired-training-assignments',
  '10 2 * * *',
  $$
    insert into public.training_assignments (
      organization_id,
      training_requirement_id,
      assigned_user_id,
      status,
      due_date,
      created_at,
      updated_at
    )
    select
      ta.organization_id,
      ta.training_requirement_id,
      ta.assigned_user_id,
      'assigned',
      (now() + (tr.frequency_months || ' months')::interval)::date,
      now(),
      now()
    from public.training_assignments ta
    join public.training_requirements tr
      on tr.id = ta.training_requirement_id
    where ta.status              = 'expired'
      and tr.frequency_months   is not null
      and not exists (
        select 1
        from public.training_assignments ta2
        where ta2.training_requirement_id = ta.training_requirement_id
          and ta2.assigned_user_id        = ta.assigned_user_id
          and ta2.organization_id         = ta.organization_id
          and ta2.status                  = 'assigned'
      )
    on conflict do nothing;
  $$
);
