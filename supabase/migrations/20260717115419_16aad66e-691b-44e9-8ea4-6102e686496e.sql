
CREATE OR REPLACE FUNCTION public.run_retention_cleanup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  telemetry_deleted bigint := 0;
  idem_deleted bigint := 0;
  audit_deleted bigint := 0;
  edge_cache_deleted bigint := 0;
  api_usage_deleted bigint := 0;
BEGIN
  DELETE FROM public.query_telemetry WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS telemetry_deleted = ROW_COUNT;

  DELETE FROM public.idempotency_keys WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS idem_deleted = ROW_COUNT;

  DELETE FROM public.edge_cache WHERE expires_at < now();
  GET DIAGNOSTICS edge_cache_deleted = ROW_COUNT;

  DELETE FROM public.api_usage_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS api_usage_deleted = ROW_COUNT;

  SET LOCAL session_replication_role = replica;
  DELETE FROM public.audit_logs
  WHERE created_at < now() - interval '180 days'
    AND (severity IS NULL OR severity IN ('low', 'info', 'debug'));
  GET DIAGNOSTICS audit_deleted = ROW_COUNT;
  SET LOCAL session_replication_role = origin;

  RETURN jsonb_build_object(
    'telemetry_deleted', telemetry_deleted,
    'idempotency_deleted', idem_deleted,
    'edge_cache_deleted', edge_cache_deleted,
    'api_usage_deleted', api_usage_deleted,
    'audit_deleted', audit_deleted,
    'ran_at', now()
  );
END;
$$;
