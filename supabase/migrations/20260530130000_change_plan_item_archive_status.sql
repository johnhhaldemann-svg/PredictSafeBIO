alter table public.change_plan_items
  drop constraint if exists change_plan_items_status_check;

alter table public.change_plan_items
  add constraint change_plan_items_status_check
  check (status in ('Planned', 'In discovery', 'Ready for demo', 'Backlog', 'Archived'));
