-- =====================================================================
-- Onda 116 — Correlação automática de causa raiz
-- O SQL apenas COLETA fatos brutos. A classificação (rateio, confiança,
-- veredito) vive em src/lib/rootCauseCorrelation.ts, fonte única de verdade.
-- =====================================================================

CREATE TABLE public.root_cause_correlation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  duration_ms integer,
  window_hours integer NOT NULL,
  -- Fatos brutos: [{parent, current_rows, rows_added_in_window, window_hours, buckets}]
  growth jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Fatos brutos: [{camera_id, camera_name, source_table, severity, direction,
  --                 sample_count, median_skew_seconds, sentinel_rows,
  --                 detected_at_ms, suppressed}]
  skew_findings jsonb NOT NULL DEFAULT '[]'::jsonb,
  parents_analyzed integer NOT NULL DEFAULT 0,
  cameras_considered integer NOT NULL DEFAULT 0,
  ok boolean NOT NULL DEFAULT true,
  error_detail text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.root_cause_correlation_runs TO authenticated;
GRANT ALL ON public.root_cause_correlation_runs TO service_role;

ALTER TABLE public.root_cause_correlation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rcc_runs_admin_select"
  ON public.root_cause_correlation_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "rcc_runs_service_all"
  ON public.root_cause_correlation_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_rcc_runs_ran_at ON public.root_cause_correlation_runs (ran_at DESC);

CREATE TRIGGER update_rcc_runs_updated_at
  BEFORE UPDATE ON public.root_cause_correlation_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- Coletor. SECURITY DEFINER porque cruza catálogo de partições com dados
-- de todos os tenants; o resultado é agregado e só admins leem.
-- ---------------------------------------------------------------------
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
  v_buckets jsonb := '{}'::jsonb;
  v_run_id  uuid;
  v_err     text;
BEGIN
  BEGIN
    -- Assinatura temporal do resíduo, vinda da triagem da Onda 109.
    SELECT COALESCE(q.buckets, '{}'::jsonb)
      INTO v_buckets
      FROM public.partition_quarantine_runs q
     WHERE q.ok
     ORDER BY q.ran_at DESC
     LIMIT 1;

    -- Crescimento por pai: primeira e última amostra dentro da janela.
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
                 'buckets', COALESCE(v_buckets -> s.parent_table, v_buckets)
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

    -- Achados de relógio mais recentes por (câmera, tabela de origem).
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

  -- Retenção de 90 dias, alinhada às demais tabelas de telemetria.
  DELETE FROM public.root_cause_correlation_runs
   WHERE ran_at < now() - interval '90 days';

  RETURN v_run_id;
END;
$$;

REVOKE ALL ON FUNCTION public.correlate_backlog_root_cause(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.correlate_backlog_root_cause(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.correlate_backlog_root_cause(integer) TO service_role;

-- Agendamento: a cada 6 horas, deslocado dos demais crons de manutenção
-- para evitar contenção de locks na janela da madrugada.
SELECT cron.schedule(
  'correlate-backlog-root-cause',
  '47 */6 * * *',
  $cron$ SELECT public.correlate_backlog_root_cause(24); $cron$
);