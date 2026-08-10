
ALTER POLICY "Admins can delete non-admin roles" ON public.user_roles
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) AND (role <> 'admin'::public.app_role));

ALTER POLICY "Admins can insert non-admin roles" ON public.user_roles
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)) AND (role <> 'admin'::public.app_role));

ALTER POLICY "Admins can update to non-admin roles" ON public.user_roles
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)))
  WITH CHECK (role <> 'admin'::public.app_role);

ALTER POLICY "Admins can view all audit logs" ON public.audit_logs
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)));

ALTER POLICY "Admins can view all roles" ON public.user_roles
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)));

ALTER POLICY "Only admins can delete roles" ON public.user_roles
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)));

ALTER POLICY "Only admins can manage roles" ON public.user_roles
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)));

ALTER POLICY "Only admins can update roles" ON public.user_roles
  USING ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)))
  WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin'::public.app_role)));
