
-- profiles: drop legacy id-based UPDATE policy, harden remaining one with WITH CHECK
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
ALTER POLICY "Users can update their own profile" ON public.profiles
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- audit_logs: consolidate SELECT into a single policy
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can view their own audit logs" ON public.audit_logs;
CREATE POLICY "Users and admins can view audit logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );

-- user_roles: consolidate SELECT into a single policy
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users and admins can view roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role))
  );
