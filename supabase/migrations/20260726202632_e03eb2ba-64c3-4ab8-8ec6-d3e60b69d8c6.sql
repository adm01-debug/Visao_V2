CREATE OR REPLACE FUNCTION public.reap_monitoring_center_leases(_at timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  released int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '15s', true);
  WITH stale AS (
    UPDATE public.monitoring_center_dispatches
       SET status='pending', claimed_by=NULL, lease_expires_at=NULL,
           last_error=COALESCE(last_error, 'lease_expired'),
           next_attempt_at=_at
     WHERE status='claimed' AND lease_expires_at < _at
    RETURNING 1
  )
  SELECT count(*)::int INTO released FROM stale;
  RETURN jsonb_build_object('released', released, 'at', _at);
END $$;

DROP FUNCTION IF EXISTS public.reap_monitoring_center_leases();

REVOKE ALL ON FUNCTION public.reap_monitoring_center_leases(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reap_monitoring_center_leases(timestamptz) TO service_role;