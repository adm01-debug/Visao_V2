REVOKE ALL ON public.maintenance_alert_dispatches FROM anon;
REVOKE ALL ON public.maintenance_alert_dispatches FROM PUBLIC;
GRANT SELECT ON public.maintenance_alert_dispatches TO authenticated;
GRANT ALL ON public.maintenance_alert_dispatches TO service_role;