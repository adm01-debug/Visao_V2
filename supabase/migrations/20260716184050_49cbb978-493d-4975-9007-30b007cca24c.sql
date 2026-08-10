-- Wave 26: Monthly index & statistics maintenance.
-- SECURITY DEFINER, only callable by admin or cron owner via GRANT below.

CREATE OR REPLACE FUNCTION public.run_index_maintenance()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  results jsonb := '[]'::jsonb;
  rec record;
  err_msg text;
  targets text[] := ARRAY[
    'public.query_telemetry',
    'public.edge_cache',
    'public.audit_logs',
    'public.user_roles',
    'public.idempotency_keys',
    'public.recognition_logs',
    'public.plate_detections'
  ];
  reindex_targets text[] := ARRAY[
    'public.idx_query_telemetry_circuit_recent',
    'public.idx_query_telemetry_edge_cache_recent'
  ];
  tgt text;
BEGIN
  -- Only admin can invoke directly; cron owner (postgres) bypasses via SECURITY DEFINER.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  -- Raise statistics target on high-cardinality hot columns (idempotent).
  BEGIN
    EXECUTE 'ALTER TABLE public.query_telemetry ALTER COLUMN operation SET STATISTICS 500';
    EXECUTE 'ALTER TABLE public.query_telemetry ALTER COLUMN created_at SET STATISTICS 500';
    EXECUTE 'ALTER TABLE public.audit_logs ALTER COLUMN created_at SET STATISTICS 500';
    EXECUTE 'ALTER TABLE public.edge_cache ALTER COLUMN expires_at SET STATISTICS 500';
    results := results || jsonb_build_object('step', 'statistics_target', 'status', 'ok');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
    results := results || jsonb_build_object('step', 'statistics_target', 'status', 'error', 'error', err_msg);
  END;

  -- ANALYZE each target independently (failure-isolated).
  FOREACH tgt IN ARRAY targets LOOP
    BEGIN
      EXECUTE format('ANALYZE %s', tgt);
      results := results || jsonb_build_object('step', 'analyze', 'target', tgt, 'status', 'ok');
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      results := results || jsonb_build_object('step', 'analyze', 'target', tgt, 'status', 'error', 'error', err_msg);
    END;
  END LOOP;

  -- REINDEX only the small, low-write indexes (bounded ACCESS EXCLUSIVE window).
  FOREACH tgt IN ARRAY reindex_targets LOOP
    BEGIN
      EXECUTE format('REINDEX INDEX %s', tgt);
      results := results || jsonb_build_object('step', 'reindex', 'target', tgt, 'status', 'ok');
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT;
      results := results || jsonb_build_object('step', 'reindex', 'target', tgt, 'status', 'error', 'error', err_msg);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'ran_at', now(),
    'results', results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.run_index_maintenance() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_index_maintenance() TO service_role;

COMMENT ON FUNCTION public.run_index_maintenance() IS
  'Wave 26: monthly ANALYZE + targeted REINDEX. Runs at 04:30 UTC on the 1st via visao-monthly-index-maintenance cron job.';