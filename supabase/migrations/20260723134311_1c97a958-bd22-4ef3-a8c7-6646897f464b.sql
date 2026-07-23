-- ============================================================
-- VISÃO — Wave: Preview Telemetry Panel
-- ============================================================
-- Tabela de eventos + índices + RLS + GRANTs + RPC agregada + realtime.
-- ============================================================

-- 1) Tabela
CREATE TABLE IF NOT EXISTS public.preview_telemetry_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id    text,
  camera_id     uuid,
  event_type    text NOT NULL CHECK (event_type IN ('started','extended','stopped','failed')),
  reason        text, -- para stopped: timer|manual|unmount|error
  error_code    text,
  codec         text,
  width         integer,
  height        integer,
  resolution    text,           -- bucket derivado (2160p/1440p/1080p/720p/480p/other)
  browser       text,
  browser_version text,
  os            text,
  network_type  text,           -- navigator.connection.effectiveType (opcional)
  duration_ms   integer,        -- só faz sentido em stopped/failed
  latency_ms    integer,        -- start→canplay em started
  extensions    integer,        -- número de extensões acumuladas
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.preview_telemetry_events IS
  'Eventos de ciclo de vida da prévia RTSP para o painel de observabilidade (VISÃO).';

-- 2) GRANTs — RLS ainda restringe as linhas visíveis por usuário.
GRANT SELECT, INSERT ON public.preview_telemetry_events TO authenticated;
GRANT ALL ON public.preview_telemetry_events TO service_role;

-- 3) RLS
ALTER TABLE public.preview_telemetry_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "preview_telemetry_insert_own"
  ON public.preview_telemetry_events
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "preview_telemetry_select_own"
  ON public.preview_telemetry_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "preview_telemetry_select_admin"
  ON public.preview_telemetry_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Índices — hot paths do painel.
CREATE INDEX IF NOT EXISTS idx_preview_telemetry_created_at
  ON public.preview_telemetry_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preview_telemetry_event_type
  ON public.preview_telemetry_events (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preview_telemetry_user
  ON public.preview_telemetry_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_preview_telemetry_session
  ON public.preview_telemetry_events (session_id)
  WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preview_telemetry_codec
  ON public.preview_telemetry_events (codec)
  WHERE codec IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_preview_telemetry_browser
  ON public.preview_telemetry_events (browser)
  WHERE browser IS NOT NULL;

-- 5) RPC agregada — SECURITY DEFINER, só admin.
CREATE OR REPLACE FUNCTION public.get_preview_telemetry_summary(
  window_hours integer DEFAULT 24
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since_ts timestamptz;
  result   jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  window_hours := GREATEST(1, LEAST(COALESCE(window_hours, 24), 24 * 30));
  since_ts := now() - make_interval(hours => window_hours);

  WITH base AS (
    SELECT * FROM public.preview_telemetry_events WHERE created_at >= since_ts
  ),
  totals AS (
    SELECT
      count(*)                                                        AS total_events,
      count(*) FILTER (WHERE event_type = 'started')                  AS started,
      count(*) FILTER (WHERE event_type = 'extended')                 AS extended,
      count(*) FILTER (WHERE event_type = 'stopped')                  AS stopped,
      count(*) FILTER (WHERE event_type = 'failed')                   AS failed,
      count(DISTINCT session_id) FILTER (WHERE session_id IS NOT NULL) AS sessions,
      count(DISTINCT user_id)                                          AS unique_users,
      avg(latency_ms) FILTER (WHERE event_type = 'started' AND latency_ms IS NOT NULL) AS avg_start_latency_ms,
      percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_ms)
        FILTER (WHERE event_type = 'started' AND latency_ms IS NOT NULL)               AS p95_start_latency_ms
    FROM base
  ),
  by_codec AS (
    SELECT
      coalesce(NULLIF(codec,''),'unknown') AS codec,
      count(*) FILTER (WHERE event_type = 'started')                AS started,
      count(*) FILTER (WHERE event_type = 'failed')                 AS failed,
      count(*)                                                      AS total
    FROM base
    WHERE event_type IN ('started','failed')
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 20
  ),
  by_resolution AS (
    SELECT
      coalesce(NULLIF(resolution,''),'unknown') AS resolution,
      count(*) FILTER (WHERE event_type = 'started')                AS started,
      count(*) FILTER (WHERE event_type = 'failed')                 AS failed,
      count(*)                                                      AS total
    FROM base
    WHERE event_type IN ('started','failed')
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 20
  ),
  by_browser AS (
    SELECT
      coalesce(NULLIF(browser,''),'unknown') AS browser,
      count(*) FILTER (WHERE event_type = 'started')                AS started,
      count(*) FILTER (WHERE event_type = 'failed')                 AS failed,
      count(*)                                                      AS total
    FROM base
    WHERE event_type IN ('started','failed')
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 20
  ),
  top_errors AS (
    SELECT
      coalesce(NULLIF(error_code,''),'unknown') AS error_code,
      count(*)                                  AS total
    FROM base
    WHERE event_type = 'failed'
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 10
  ),
  timeline AS (
    SELECT
      date_trunc('hour', created_at) AS bucket,
      count(*) FILTER (WHERE event_type = 'started')  AS started,
      count(*) FILTER (WHERE event_type = 'extended') AS extended,
      count(*) FILTER (WHERE event_type = 'stopped')  AS stopped,
      count(*) FILTER (WHERE event_type = 'failed')   AS failed
    FROM base
    GROUP BY 1
    ORDER BY 1
  )
  SELECT jsonb_build_object(
    'window_hours', window_hours,
    'generated_at', now(),
    'totals', to_jsonb(t.*),
    'by_codec',      coalesce((SELECT jsonb_agg(row_to_json(c)) FROM by_codec c),      '[]'::jsonb),
    'by_resolution', coalesce((SELECT jsonb_agg(row_to_json(r)) FROM by_resolution r), '[]'::jsonb),
    'by_browser',    coalesce((SELECT jsonb_agg(row_to_json(b)) FROM by_browser b),    '[]'::jsonb),
    'top_errors',    coalesce((SELECT jsonb_agg(row_to_json(e)) FROM top_errors e),    '[]'::jsonb),
    'timeline',      coalesce((SELECT jsonb_agg(row_to_json(tl)) FROM timeline tl),    '[]'::jsonb)
  )
  INTO result
  FROM totals t;

  RETURN coalesce(result, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_preview_telemetry_summary(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.get_preview_telemetry_summary(integer) TO authenticated;

COMMENT ON FUNCTION public.get_preview_telemetry_summary(integer) IS
  'Retorna agregados da telemetria de prévias (admin apenas). Janela 1h..720h.';

-- 6) Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'preview_telemetry_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.preview_telemetry_events';
  END IF;
END$$;

ALTER TABLE public.preview_telemetry_events REPLICA IDENTITY FULL;