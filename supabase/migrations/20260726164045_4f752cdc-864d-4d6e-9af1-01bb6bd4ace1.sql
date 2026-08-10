-- ============================================================
-- Onda 112 — Detecção de relógio descalibrado (clock skew) por câmera
-- ============================================================

CREATE TABLE public.camera_clock_skew_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at            timestamptz NOT NULL DEFAULT now(),
  duration_ms       integer     NOT NULL DEFAULT 0,
  lookback_hours    integer     NOT NULL DEFAULT 168,
  min_samples       integer     NOT NULL DEFAULT 5,
  warn_seconds      integer     NOT NULL DEFAULT 300,
  critical_seconds  integer     NOT NULL DEFAULT 3600,
  sources           text[]      NOT NULL DEFAULT ARRAY[]::text[],
  cameras_analyzed  integer     NOT NULL DEFAULT 0,
  cameras_warning   integer     NOT NULL DEFAULT 0,
  cameras_critical  integer     NOT NULL DEFAULT 0,
  ok                boolean     NOT NULL DEFAULT true,
  error_detail      text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.camera_clock_skew_runs TO authenticated;
GRANT ALL    ON public.camera_clock_skew_runs TO service_role;
ALTER TABLE public.camera_clock_skew_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camera_clock_skew_runs_admin_read"
  ON public.camera_clock_skew_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_camera_clock_skew_runs_ran_at
  ON public.camera_clock_skew_runs (ran_at DESC);

CREATE TRIGGER trg_camera_clock_skew_runs_updated_at
  BEFORE UPDATE ON public.camera_clock_skew_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------

CREATE TABLE public.camera_clock_skew_findings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                uuid NOT NULL REFERENCES public.camera_clock_skew_runs(id) ON DELETE CASCADE,
  camera_id             uuid REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id               uuid,
  source_table          text        NOT NULL,
  severity              text        NOT NULL,
  direction             text        NOT NULL DEFAULT 'none',
  sample_count          integer     NOT NULL DEFAULT 0,
  median_skew_seconds   numeric     NOT NULL DEFAULT 0,
  max_abs_skew_seconds  numeric     NOT NULL DEFAULT 0,
  sentinel_rows         integer     NOT NULL DEFAULT 0,
  suppressed            boolean     NOT NULL DEFAULT false,
  reason                text        NOT NULL DEFAULT '',
  detected_at           timestamptz NOT NULL DEFAULT now(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT camera_clock_skew_findings_severity_check
    CHECK (severity IN ('insufficient_data', 'ok', 'warning', 'critical')),
  CONSTRAINT camera_clock_skew_findings_direction_check
    CHECK (direction IN ('none', 'ahead', 'behind'))
);

GRANT SELECT ON public.camera_clock_skew_findings TO authenticated;
GRANT ALL    ON public.camera_clock_skew_findings TO service_role;
ALTER TABLE public.camera_clock_skew_findings ENABLE ROW LEVEL SECURITY;

-- Administradores enxergam a frota inteira (diagnóstico de infraestrutura).
CREATE POLICY "camera_clock_skew_findings_admin_read"
  ON public.camera_clock_skew_findings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- O dono da câmera enxerga apenas os achados das suas próprias câmeras.
CREATE POLICY "camera_clock_skew_findings_owner_read"
  ON public.camera_clock_skew_findings FOR SELECT TO authenticated
  USING (user_id IS NOT NULL AND user_id = auth.uid());

CREATE INDEX idx_camera_clock_skew_findings_run
  ON public.camera_clock_skew_findings (run_id, severity);
CREATE INDEX idx_camera_clock_skew_findings_camera
  ON public.camera_clock_skew_findings (camera_id, detected_at DESC);
CREATE INDEX idx_camera_clock_skew_findings_owner
  ON public.camera_clock_skew_findings (user_id, detected_at DESC);

CREATE TRIGGER trg_camera_clock_skew_findings_updated_at
  BEFORE UPDATE ON public.camera_clock_skew_findings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------
-- Rotina de detecção — SOMENTE LEITURA sobre os dados de eventos.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.detect_camera_clock_skew(
  lookback_hours   integer DEFAULT 168,
  min_samples      integer DEFAULT 5,
  warn_seconds     integer DEFAULT 300,
  critical_seconds integer DEFAULT 3600
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t0            timestamptz := clock_timestamp();
  run_id        uuid;
  src           record;
  sources       text[] := ARRAY[]::text[];
  window_start  timestamptz;
  future_edge   timestamptz;
  past_edge     timestamptz := make_timestamptz(2000, 1, 1, 0, 0, 0);
  inserted      integer := 0;
  n_warning     integer := 0;
  n_critical    integer := 0;
  n_total       integer := 0;
BEGIN
  -- Guarda de privilégio: chamadas vindas do cron/service_role têm auth.uid()
  -- nulo; chamadas autenticadas exigem papel de administrador.
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'apenas administradores podem executar detect_camera_clock_skew';
  END IF;

  lookback_hours   := LEAST(GREATEST(COALESCE(lookback_hours, 168), 1), 8760);
  min_samples      := LEAST(GREATEST(COALESCE(min_samples, 5), 1), 10000);
  warn_seconds     := LEAST(GREATEST(COALESCE(warn_seconds, 300), 1), 86400);
  critical_seconds := LEAST(GREATEST(COALESCE(critical_seconds, 3600), warn_seconds + 1), 604800);

  window_start := now() - make_interval(hours => lookback_hours);
  future_edge  := now() + interval '30 days';

  -- Nunca deixar a análise segurar o pool de conexões.
  PERFORM set_config('statement_timeout', '90s', true);

  INSERT INTO public.camera_clock_skew_runs
    (lookback_hours, min_samples, warn_seconds, critical_seconds)
  VALUES (lookback_hours, min_samples, warn_seconds, critical_seconds)
  RETURNING id INTO run_id;

  -- Descobre dinamicamente as tabelas de eventos que carregam,
  -- simultaneamente, a hora do dispositivo e a hora de ingestão.
  FOR src IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'camera_id'  AND a.attnum > 0 AND NOT a.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'timestamp'  AND a.attnum > 0 AND NOT a.attisdropped)
      AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'created_at' AND a.attnum > 0 AND NOT a.attisdropped)
      AND NOT EXISTS (SELECT 1 FROM pg_inherits i WHERE i.inhrelid = c.oid)  -- ignora partições filhas
    ORDER BY c.relname
  LOOP
    sources := array_append(sources, src.tbl);

    -- Uma única passada agregada por tabela. A classificação abaixo é a
    -- tradução literal das invariantes I1..I8 de src/lib/clockSkew.ts.
    EXECUTE format($fmt$
      INSERT INTO public.camera_clock_skew_findings
        (run_id, camera_id, user_id, source_table, severity, direction,
         sample_count, median_skew_seconds, max_abs_skew_seconds,
         sentinel_rows, suppressed, reason)
      SELECT
        %2$L::uuid,
        agg.camera_id,
        agg.user_id,
        %1$L,
        CASE
          WHEN agg.samples < %5$s AND agg.sentinel_rows = 0 THEN 'insufficient_data'
          WHEN agg.sentinel_rows > 0                        THEN 'critical'
          WHEN abs(agg.median_skew) >= %7$s                 THEN 'critical'
          WHEN abs(agg.median_skew) >= %6$s                 THEN 'warning'
          ELSE 'ok'
        END,
        CASE
          WHEN abs(agg.median_skew) < 1 THEN 'none'
          WHEN agg.median_skew > 0      THEN 'ahead'
          ELSE 'behind'
        END,
        agg.samples,
        round(agg.median_skew, 3),
        round(greatest(agg.max_abs_skew, abs(agg.median_skew)), 3),
        agg.sentinel_rows,
        CASE
          WHEN agg.samples < %5$s AND agg.sentinel_rows = 0 THEN true
          ELSE COALESCE(h.state, 'unknown') <> 'online'
        END,
        CASE
          WHEN agg.samples < %5$s AND agg.sentinel_rows = 0
            THEN 'apenas ' || agg.samples || ' amostra(s) na janela (mínimo %5$s)'
          WHEN agg.sentinel_rows > 0
            THEN agg.sentinel_rows || ' evento(s) com carimbo impossível — RTC provavelmente sem NTP'
          WHEN abs(agg.median_skew) >= %7$s
            THEN 'desvio mediano de ' || round(abs(agg.median_skew))::text || 's (limite crítico %7$ss)'
          WHEN abs(agg.median_skew) >= %6$s
            THEN 'desvio mediano de ' || round(abs(agg.median_skew))::text || 's (limite de atenção %6$ss)'
          ELSE 'relógio dentro da tolerância (' || round(abs(agg.median_skew))::text || 's)'
        END
      FROM (
        SELECT
          t.camera_id,
          min(t.user_id) AS user_id,
          count(*)::int  AS samples,
          COALESCE(percentile_cont(0.5) WITHIN GROUP (
            ORDER BY EXTRACT(EPOCH FROM (t."timestamp" - t.created_at))
          ), 0)::numeric AS median_skew,
          COALESCE(max(abs(EXTRACT(EPOCH FROM (t."timestamp" - t.created_at)))), 0)::numeric AS max_abs_skew,
          count(*) FILTER (WHERE t."timestamp" < %3$L OR t."timestamp" > %4$L)::int AS sentinel_rows
        FROM public.%1$I t
        WHERE t.camera_id IS NOT NULL
          AND t.created_at >= now() - make_interval(hours => %8$s)
        GROUP BY t.camera_id
      ) agg
      LEFT JOIN public.camera_health_state h ON h.camera_id = agg.camera_id
    $fmt$, src.tbl, run_id, past_edge, future_edge,
           min_samples, warn_seconds, critical_seconds, lookback_hours);

    GET DIAGNOSTICS inserted = ROW_COUNT;
    n_total := n_total + inserted;
  END LOOP;

  SELECT
    count(*) FILTER (WHERE severity = 'warning'),
    count(*) FILTER (WHERE severity = 'critical')
  INTO n_warning, n_critical
  FROM public.camera_clock_skew_findings
  WHERE run_id = detect_camera_clock_skew.run_id;

  UPDATE public.camera_clock_skew_runs
  SET duration_ms      = (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int,
      sources          = sources,
      cameras_analyzed = n_total,
      cameras_warning  = n_warning,
      cameras_critical = n_critical,
      ok               = true
  WHERE id = run_id;

  -- Retenção: 90 dias de histórico é suficiente para tendência de hardware.
  DELETE FROM public.camera_clock_skew_runs WHERE ran_at < now() - interval '90 days';

  RETURN jsonb_build_object(
    'run_id',   run_id,
    'sources',  to_jsonb(sources),
    'analyzed', n_total,
    'warning',  n_warning,
    'critical', n_critical
  );
EXCEPTION WHEN OTHERS THEN
  IF run_id IS NOT NULL THEN
    UPDATE public.camera_clock_skew_runs
    SET ok = false,
        error_detail = left(SQLERRM, 500),
        duration_ms  = (EXTRACT(EPOCH FROM (clock_timestamp() - t0)) * 1000)::int
    WHERE id = run_id;
  END IF;
  RETURN jsonb_build_object('ok', false, 'error', left(SQLERRM, 500));
END;
$$;

REVOKE ALL     ON FUNCTION public.detect_camera_clock_skew(integer, integer, integer, integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.detect_camera_clock_skew(integer, integer, integer, integer) TO authenticated, service_role;

-- ------------------------------------------------------------
-- Agendamento diário (02:37), antes da triagem da quarentena (02:57).
-- ------------------------------------------------------------
SELECT cron.unschedule('camera-clock-skew-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'camera-clock-skew-daily');

SELECT cron.schedule(
  'camera-clock-skew-daily',
  '37 2 * * *',
  $cron$ SELECT public.detect_camera_clock_skew(); $cron$
);