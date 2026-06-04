-- Daily cron job: invoke the inspection-scheduler edge function at 08:00 UTC.
-- Requires pg_cron and pg_net extensions (enabled by default on Supabase).

-- Enable extensions if not already present
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any existing schedule with the same name (idempotent)
SELECT cron.unschedule('inspection-scheduler-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'inspection-scheduler-daily'
);

-- Schedule: 08:00 UTC every day
SELECT cron.schedule(
  'inspection-scheduler-daily',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/inspection-scheduler',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key')
    ),
    body   := '{}'::jsonb
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS
  'Drives the PredictSafeBIO compliance calendar — runs inspection-scheduler daily at 08:00 UTC.';
