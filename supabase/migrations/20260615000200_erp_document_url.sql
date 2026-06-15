-- Add document attachment column to emergency response plans
alter table public.emergency_response_plans
  add column if not exists document_url text;
