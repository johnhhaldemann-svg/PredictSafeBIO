-- One subscription row per organization.
-- Required for setSubscription()'s upsert(onConflict: "organization_id"),
-- which the Stripe webhook relies on to sync subscription state.
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);
