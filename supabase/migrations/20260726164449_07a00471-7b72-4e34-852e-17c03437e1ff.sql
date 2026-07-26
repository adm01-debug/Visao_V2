REVOKE ALL ON public.camera_clock_skew_runs     FROM anon, PUBLIC;
REVOKE ALL ON public.camera_clock_skew_findings FROM anon, PUBLIC;

GRANT SELECT ON public.camera_clock_skew_runs     TO authenticated;
GRANT SELECT ON public.camera_clock_skew_findings TO authenticated;
GRANT ALL    ON public.camera_clock_skew_runs     TO service_role;
GRANT ALL    ON public.camera_clock_skew_findings TO service_role;