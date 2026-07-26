CREATE OR REPLACE FUNCTION public.correlate_backlog_root_cause(
  p_window_hours integer DEFAULT 24
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_started timestamptz := clock_timestamp();
  v_window  integer := GREATEST(1, COALESCE(p_window_hours, 24));
  v_growth  jsonb := '[]'::jsonb;
  v_skew    jsonb := '[]'::jsonb;
  v_buckets jsonb := '[]'::jsonb;
  v_run_id  uuid;
  v_err     text;
BEGIN
  BEGIN
    -- `buckets` da Onda 109 é um ARRAY de objetos por pai particionado.
    SELECT COALESCE(q.buckets, '[]'::jsonb)
      INTO v_buckets
      FROM public.partition_quarantine_runs q
     WHERE q.ok
     ORDER BY q.ran_at DESC
     LIMIT 1;

    SELECT COALESCE(jsonb_agg(g ORDER BY g->>'parent'), '[]'::jsonb)
      INTO v_growth
      FROM (
        SELECT jsonb_build_object(
                 'parent', s.parent_table,
                 'current_rows', MAX(s.row_count) FILTER (WHERE s.sampled_at = mx.last_at),
                 'rows_added_in_window',
                   COALESCE(MAX(s.row_count) FILTER (WHERE s.sampled_at = mx.last_at), 0)
                 - COALESCE(MAX(s.row_count) FILTER (WHERE s.sampled_at = mx.first_at), 0),
                 'window_hours',
                   GREATEST(0, EXTRACT(EPOCH FROM (mx.last_at - mx.first_at)) / 3600.0),
                 -- Assinatura temporal DO PAI: casar pelo campo `parent` do
                 -- elemento evita atribuir a uma tabela o resíduo de outra.
                 'buckets', COALESCE((
                    SELECT jsonb_build_object(
                             'pre2000',   COALESCE((b->'counts'->>'pre_2000')::bigint, 0),
                             'future',    COALESCE((b->'counts'->>'far_future')::bigint, 0),
                             'recentGap', COALESCE((b->'counts'->>'drainable')::bigint, 0),
                             'unknown',   GREATEST(0,
                                            COALESCE((b->'counts'->>'total')::bigint, 0)
                                          - COALESCE((b->'counts'->>'pre_2000')::bigint, 0)
                                          - COALESCE((b->'counts'->>'far_future')::bigint, 0)
                                          - COALESCE((b->'counts'->>'drainable')::bigint, 0))
                           )
                      FROM jsonb_array_elements(v_buckets) b
                     WHERE b->>'parent' = s.parent_table
                     LIMIT 1
                 ), jsonb_build_object('pre2000', 0, 'future', 0, 'recentGap', 0, 'unknown', 0))
               ) AS g
          FROM public.partition_backlog_samples s
          JOIN (
                SELECT parent_table,
                       MIN(sampled_at) AS first_at,
                       MAX(sampled_at) AS last_at
                  FROM public.partition_backlog_samples
                 WHERE sampled_at >= now() - make_interval(hours => v_window)
                 GROUP BY parent_table
               ) mx ON mx.parent_table = s.parent_table
         WHERE s.sampled_at >= now() - make_interval(hours => v_window)
         GROUP BY s.parent_table, mx.first_at, mx.last_at
      ) sub;

    SELECT COALESCE(jsonb_agg(f ORDER BY f->>'camera_id'), '[]'::jsonb)
      INTO v_skew
      FROM (
        SELECT DISTINCT ON (k.camera_id, k.source_table)
               jsonb_build_object(
                 'camera_id', k.camera_id,
                 'camera_name', c.name,
                 'source_table', k.source_table,
                 'severity', k.severity,
                 'direction', k.direction,
                 'sample_count', k.sample_count,
                 'median_skew_seconds', k.median_skew_seconds,
                 'sentinel_rows', k.sentinel_rows,
                 'detected_at_ms', (EXTRACT(EPOCH FROM k.detected_at) * 1000)::bigint,
                 'suppressed', COALESCE(k.suppressed, false)
               ) AS f
          FROM public.camera_clock_skew_findings k
          LEFT JOIN public.cameras c ON c.id = k.camera_id
         WHERE k.detected_at >= now() - interval '7 days'
         ORDER BY k.camera_id, k.source_table, k.detected_at DESC
      ) sub2;
  EXCEPTION WHEN OTHERS THEN
    v_err := SQLERRM;
  END;

  INSERT INTO public.root_cause_correlation_runs (
    duration_ms, window_hours, growth, skew_findings,
    parents_analyzed, cameras_considered, ok, error_detail
  ) VALUES (
    (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
    v_window,
    COALESCE(v_growth, '[]'::jsonb),
    COALESCE(v_skew, '[]'::jsonb),
    jsonb_array_length(COALESCE(v_growth, '[]'::jsonb)),
    jsonb_array_length(COALESCE(v_skew, '[]'::jsonb)),
    v_err IS NULL,
    v_err
  )
  RETURNING id INTO v_run_id;

  DELETE FROM public.root_cause_correlation_runs
   WHERE ran_at < now() - interval '90 days';

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.correlate_backlog_root_cause(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.correlate_backlog_root_cause(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correlate_backlog_root_cause(integer) TO service_role;