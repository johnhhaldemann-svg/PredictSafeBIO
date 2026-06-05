-- Performance: wrap auth.uid() in (select auth.uid()) on feature_permission_grants
-- RLS policies so the planner evaluates it once (initPlan) instead of per row.
-- Semantically IDENTICAL to the existing policies — only the auth.uid() call is
-- wrapped. Clears the `auth_rls_initplan` advisor warnings (fpg_read/insert/
-- update/delete). NOT yet applied to the live DB — ship via the deploy workflow.

DROP POLICY IF EXISTS fpg_read ON public.feature_permission_grants;
CREATE POLICY fpg_read ON public.feature_permission_grants
  FOR SELECT
  USING (
    ((select auth.uid()) = user_id)
    OR (EXISTS (SELECT 1 FROM profiles
                WHERE profiles.id = (select auth.uid())
                  AND profiles.role = ANY (ARRAY['superadmin'::text, 'platform_staff'::text])))
  );

DROP POLICY IF EXISTS fpg_insert ON public.feature_permission_grants;
CREATE POLICY fpg_insert ON public.feature_permission_grants
  FOR INSERT
  WITH CHECK (
    ((scope = 'platform'::text) AND (EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = 'superadmin'::text)))
    OR ((scope = 'org'::text) AND (EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text, 'admin'::text]))))
  );

DROP POLICY IF EXISTS fpg_update ON public.feature_permission_grants;
CREATE POLICY fpg_update ON public.feature_permission_grants
  FOR UPDATE
  USING (
    ((scope = 'platform'::text) AND (EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = 'superadmin'::text)))
    OR ((scope = 'org'::text) AND (EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text, 'admin'::text]))))
  );

DROP POLICY IF EXISTS fpg_delete ON public.feature_permission_grants;
CREATE POLICY fpg_delete ON public.feature_permission_grants
  FOR DELETE
  USING (
    ((scope = 'platform'::text) AND (EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = 'superadmin'::text)))
    OR ((scope = 'org'::text) AND (EXISTS (SELECT 1 FROM profiles
        WHERE profiles.id = (select auth.uid()) AND profiles.role = ANY (ARRAY['superadmin'::text, 'owner'::text, 'admin'::text]))))
  );
