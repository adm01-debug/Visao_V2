
CREATE TABLE IF NOT EXISTS public.db_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  db_size_bytes bigint NOT NULL,
  connections_total int NOT NULL,
  connections_active int NOT NULL,
  connections_idle int NOT NULL,
  connections_idle_in_tx int NOT NULL,
  deadlocks bigint NOT NULL,
  xact_commit bigint NOT NULL,
  xact_rollback bigint NOT NULL,
  temp_bytes bigint NOT NULL,
  blks_hit bigint NOT NULL,
  blks_read bigint NOT NULL,
  cache_hit_ratio numeric(6,4),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT SELECT ON public.db_health_snapshots TO authenticated;
GRANT ALL ON public.db_health_snapshots TO service_role;

ALTER TABLE public.db_health_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view db health snapshots"
  ON public.db_health_snapshots FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages snapshots"
  ON public.db_health_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_db_health_snapshots_captured_at
  ON public.db_health_snapshots (captured_at DESC);

CREATE OR REPLACE FUNCTION public.capture_db_health_snapshot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_total int; v_active int; v_idle int; v_idle_tx int;
  v_size bigint;
  v_deadlocks bigint; v_commit bigint; v_rollback bigint;
  v_temp bigint; v_hit bigint; v_read bigint;
  v_ratio numeric(6,4);
BEGIN
  SELECT pg_database_size(current_database()) INTO v_size;

  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE state = 'active')::int,
    COUNT(*) FILTER (WHERE state = 'idle')::int,
    COUNT(*) FILTER (WHERE state = 'idle in transaction')::int
  INTO v_total, v_active, v_idle, v_idle_tx
  FROM pg_stat_activity
  WHERE datname = current_database();

  SELECT deadlocks, xact_commit, xact_rollback, temp_bytes, blks_hit, blks_read
  INTO v_deadlocks, v_commit, v_rollback, v_temp, v_hit, v_read
  FROM pg_stat_database
  WHERE datname = current_database();

  v_ratio := CASE
    WHEN (v_hit + v_read) > 0 THEN ROUND((v_hit::numeric / (v_hit + v_read))::numeric, 4)
    ELSE NULL
  END;

  INSERT INTO public.db_health_snapshots (
    db_size_bytes, connections_total, connections_active, connections_idle,
    connections_idle_in_tx, deadlocks, xact_commit, xact_rollback,
    temp_bytes, blks_hit, blks_read, cache_hit_ratio
  ) VALUES (
    v_size, v_total, v_active, v_idle, v_idle_tx,
    v_deadlocks, v_commit, v_rollback, v_temp, v_hit, v_read, v_ratio
  ) RETURNING id INTO v_id;

  DELETE FROM public.db_health_snapshots
  WHERE captured_at < now() - interval '30 days';

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.capture_db_health_snapshot() FROM PUBLIC, anon, authenticated;
