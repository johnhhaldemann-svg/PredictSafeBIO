-- Manual v1.1 alignment — tasks linked to register + evidence + escalation + reviewer.
alter table public.tasks add column if not exists risk_register_entry_id uuid references public.risk_register_entries(id) on delete set null;
alter table public.tasks add column if not exists evidence_required text[] not null default '{}';
alter table public.tasks add column if not exists escalation_triggered boolean not null default false;
alter table public.tasks add column if not exists qualified_reviewer_id uuid references public.profiles(id) on delete set null;
