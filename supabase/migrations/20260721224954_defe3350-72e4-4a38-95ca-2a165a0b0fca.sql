
-- ============================================================
-- Wave Shinobi 7 — Stream health & auto-restart
-- ============================================================

-- 1) stream_health_checks (rolling window of pings)
CREATE TABLE IF NOT EXISTS public.stream_health_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('ok','fail')),
  latency_ms INTEGER,
  http_code INTEGER,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shc_camera_created ON public.stream_health_checks(camera_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shc_user ON public.stream_health_checks(user_id);

GRANT SELECT, INSERT ON public.stream_health_checks TO authenticated;
GRANT ALL ON public.stream_health_checks TO service_role;
ALTER TABLE public.stream_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hc_select_own" ON public.stream_health_checks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "hc_insert_own" ON public.stream_health_checks
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "hc_service_all" ON public.stream_health_checks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) stream_restart_events
CREATE TABLE IF NOT EXISTS public.stream_restart_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  triggered_by TEXT NOT NULL DEFAULT 'auto' CHECK (triggered_by IN ('auto','manual')),
  succeeded BOOLEAN,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sre_camera_created ON public.stream_restart_events(camera_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sre_user ON public.stream_restart_events(user_id);

GRANT SELECT, INSERT ON public.stream_restart_events TO authenticated;
GRANT ALL ON public.stream_restart_events TO service_role;
ALTER TABLE public.stream_restart_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sre_select_own" ON public.stream_restart_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sre_insert_own" ON public.stream_restart_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND triggered_by = 'manual');
CREATE POLICY "sre_service_all" ON public.stream_restart_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) Evaluate + queue auto-restart (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.evaluate_and_restart_streams()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_last_attempt INTEGER;
  v_last_ts TIMESTAMPTZ;
  v_wait_min INTEGER;
  v_created INTEGER := 0;
BEGIN
  FOR v_row IN
    WITH windowed AS (
      SELECT
        c.id AS camera_id,
        c.user_id,
        (
          SELECT COUNT(*) FILTER (WHERE h.status = 'fail')
          FROM (
            SELECT status FROM public.stream_health_checks
            WHERE camera_id = c.id
            ORDER BY created_at DESC
            LIMIT 6
          ) h
        ) AS fail_count,
        (
          SELECT COUNT(*) FROM public.stream_health_checks
          WHERE camera_id = c.id
            AND created_at > now() - interval '15 minutes'
        ) AS recent_total
      FROM public.cameras c
    )
    SELECT camera_id, user_id
    FROM windowed
    WHERE recent_total >= 6 AND fail_count >= 3
  LOOP
    SELECT attempt, created_at INTO v_last_attempt, v_last_ts
    FROM public.stream_restart_events
    WHERE camera_id = v_row.camera_id AND triggered_by = 'auto'
    ORDER BY created_at DESC LIMIT 1;

    v_last_attempt := COALESCE(v_last_attempt, 0);
    v_wait_min := LEAST(60, GREATEST(1, POWER(2, v_last_attempt)::INTEGER));

    IF v_last_ts IS NULL OR v_last_ts < now() - (v_wait_min || ' minutes')::interval THEN
      INSERT INTO public.stream_restart_events(user_id, camera_id, reason, attempt, triggered_by)
      VALUES (v_row.user_id, v_row.camera_id, 'auto:health_window_degraded', v_last_attempt + 1, 'auto');
      v_created := v_created + 1;
    END IF;
  END LOOP;

  -- Retention: keep 7 days of checks
  DELETE FROM public.stream_health_checks WHERE created_at < now() - interval '7 days';
  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_and_restart_streams() FROM public;
GRANT EXECUTE ON FUNCTION public.evaluate_and_restart_streams() TO service_role;

-- 4) Cron every 2 minutes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('evaluate_and_restart_streams_every_2m')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate_and_restart_streams_every_2m');
    PERFORM cron.schedule(
      'evaluate_and_restart_streams_every_2m',
      '*/2 * * * *',
      $CRON$ SELECT public.evaluate_and_restart_streams(); $CRON$
    );
  END IF;
END $$;
