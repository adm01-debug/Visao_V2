REVOKE ALL ON public.monitoring_center_accounts FROM anon, authenticated, PUBLIC;
REVOKE ALL ON public.monitoring_center_dispatches FROM anon, authenticated, PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitoring_center_accounts TO authenticated;
GRANT SELECT ON public.monitoring_center_dispatches TO authenticated;
GRANT ALL ON public.monitoring_center_accounts TO service_role;
GRANT ALL ON public.monitoring_center_dispatches TO service_role;