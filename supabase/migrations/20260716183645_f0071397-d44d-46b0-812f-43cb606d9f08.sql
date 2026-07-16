-- Wave 25: Partial index to accelerate /health circuit-transition lookups.
-- Query pattern: WHERE operation='circuit_transition' AND created_at >= now()-'15min'
-- ORDER BY created_at DESC LIMIT 20.
-- CONCURRENTLY is not allowed inside a migration transaction, so we use a
-- plain CREATE INDEX IF NOT EXISTS; the table is small at index-creation
-- time (rows only accrue after Wave 24 goes live).

CREATE INDEX IF NOT EXISTS idx_query_telemetry_circuit_recent
  ON public.query_telemetry (created_at DESC)
  WHERE operation = 'circuit_transition';

COMMENT ON INDEX public.idx_query_telemetry_circuit_recent IS
  'Wave 25: bounds /health circuit-transition lookup to <=20 tuples regardless of table growth.';