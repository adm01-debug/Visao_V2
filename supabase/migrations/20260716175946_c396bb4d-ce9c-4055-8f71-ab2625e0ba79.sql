-- Wave 11: dedicated edge_cache table with per-namespace TTL + cache hit metrics.
-- Isolated from idempotency_keys so cache retention and access don't conflict with idempotency semantics.

CREATE TABLE IF NOT EXISTS public.edge_cache (
  key TEXT PRIMARY KEY,
  namespace TEXT NOT NULL,
  response JSONB NOT NULL,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT edge_cache_size_cap CHECK (size_bytes <= 1048576)
);

CREATE INDEX IF NOT EXISTS idx_edge_cache_expires_at ON public.edge_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_edge_cache_namespace ON public.edge_cache (namespace);

GRANT ALL ON public.edge_cache TO service_role;
-- No grants to anon/authenticated: cache is server-only.

ALTER TABLE public.edge_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "edge_cache deny all client access"
  ON public.edge_cache
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Cleanup expired rows; safe to call from cron or from edge functions.
CREATE OR REPLACE FUNCTION public.cleanup_edge_cache()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed BIGINT;
BEGIN
  DELETE FROM public.edge_cache WHERE expires_at < now();
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_edge_cache() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_edge_cache() TO service_role;

-- Extend run_retention_cleanup to include edge_cache purge.
CREATE OR REPLACE FUNCTION public.run_retention_cleanup()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  telemetry_deleted bigint := 0;
  idem_deleted bigint := 0;
  audit_deleted bigint := 0;
  edge_cache_deleted bigint := 0;
BEGIN
  DELETE FROM public.query_telemetry WHERE created_at < now() - interval '30 days';
  GET DIAGNOSTICS telemetry_deleted = ROW_COUNT;

  DELETE FROM public.idempotency_keys WHERE created_at < now() - interval '7 days';
  GET DIAGNOSTICS idem_deleted = ROW_COUNT;

  DELETE FROM public.edge_cache WHERE expires_at < now();
  GET DIAGNOSTICS edge_cache_deleted = ROW_COUNT;

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
    'audit_deleted', audit_deleted,
    'ran_at', now()
  );
END;
$function$;
