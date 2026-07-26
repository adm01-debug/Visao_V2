-- ============================================================================
-- Onda 125 — Permanência (dwell) por zona + veículo recorrente
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dwell_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL,
  camera_id        uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  zone_id          uuid REFERENCES public.zones(id) ON DELETE SET NULL,
  track_key        text NOT NULL,
  started_at       timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz,
  detections       integer NOT NULL DEFAULT 1 CHECK (detections > 0),
  peak_confidence  numeric(5,4) NOT NULL DEFAULT 0
                     CHECK (peak_confidence >= 0 AND peak_confidence <= 1),
  alerted_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dwell_sessions_window_sane CHECK (last_seen_at >= started_at),
  CONSTRAINT dwell_sessions_end_sane CHECK (ended_at IS NULL OR ended_at >= last_seen_at)
);

REVOKE ALL ON public.dwell_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dwell_sessions TO authenticated;
GRANT ALL ON public.dwell_sessions TO service_role;

ALTER TABLE public.dwell_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='dwell_sessions'
       AND policyname='dwell_sessions_user_isolation'
  ) THEN
    CREATE POLICY dwell_sessions_user_isolation
      ON public.dwell_sessions FOR ALL TO authenticated
      USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Uma única sessão aberta por (câmera, zona, alvo). Zona nula é caso legítimo
-- (câmera sem zona desenhada), por isso o índice usa COALESCE.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dwell_sessions_open
  ON public.dwell_sessions (camera_id, COALESCE(zone_id, '00000000-0000-0000-0000-000000000000'::uuid), track_key)
  WHERE ended_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_dwell_sessions_user_time
  ON public.dwell_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_dwell_sessions_open_scan
  ON public.dwell_sessions (last_seen_at) WHERE ended_at IS NULL;

CREATE OR REPLACE FUNCTION public.touch_dwell_sessions()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_dwell_sessions ON public.dwell_sessions;
CREATE TRIGGER trg_touch_dwell_sessions
  BEFORE UPDATE ON public.dwell_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_dwell_sessions();

-- ----------------------------------------------------------------------------
-- Políticas expostas para paridade SQL ↔ TypeScript.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dwell_policy()
RETURNS TABLE (
  gap_seconds int, min_dwell_seconds int, max_open_seconds int,
  min_detections int, min_confidence numeric, alert_cooldown_seconds int
)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 30, 60, 21600, 3, 0.45::numeric, 900;
$$;

CREATE OR REPLACE FUNCTION public.vehicle_recurrence_policy()
RETURNS TABLE (
  window_minutes int, min_passes int, same_pass_seconds int,
  alert_cooldown_minutes int, min_confidence numeric
)
LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT 180, 3, 120, 180, 0.60::numeric;
$$;

REVOKE ALL ON FUNCTION public.dwell_policy() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dwell_policy() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.vehicle_recurrence_policy() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vehicle_recurrence_policy() TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Observação de permanência com histerese: reaparecer dentro da folga continua
-- a MESMA sessão; além dela, é outra permanência.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_dwell_observation(
  _user_id     uuid,
  _camera_id   uuid,
  _zone_id     uuid,
  _track_key   text,
  _confidence  numeric DEFAULT 0,
  _observed_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pol       record;
  open_row  record;
  new_id    uuid;
BEGIN
  SELECT * INTO pol FROM public.dwell_policy();

  IF _track_key IS NULL OR length(trim(_track_key)) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_track_key');
  END IF;
  IF _confidence < pol.min_confidence THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'low_confidence');
  END IF;

  SELECT * INTO open_row
    FROM public.dwell_sessions
   WHERE camera_id = _camera_id
     AND track_key = _track_key
     AND zone_id IS NOT DISTINCT FROM _zone_id
     AND ended_at IS NULL
   FOR UPDATE;

  IF open_row.id IS NOT NULL THEN
    -- Observação fora de ordem não pode encolher a janela nem inflar contagem.
    IF _observed_at <= open_row.last_seen_at THEN
      RETURN jsonb_build_object('ok', true, 'session_id', open_row.id, 'action', 'ignored_out_of_order');
    END IF;

    IF _observed_at - open_row.last_seen_at <= make_interval(secs => pol.gap_seconds)
       AND _observed_at - open_row.started_at <= make_interval(secs => pol.max_open_seconds) THEN
      UPDATE public.dwell_sessions
         SET last_seen_at    = _observed_at,
             detections      = detections + 1,
             peak_confidence = GREATEST(peak_confidence, _confidence)
       WHERE id = open_row.id;
      RETURN jsonb_build_object('ok', true, 'session_id', open_row.id, 'action', 'extended');
    END IF;

    UPDATE public.dwell_sessions SET ended_at = open_row.last_seen_at WHERE id = open_row.id;
  END IF;

  INSERT INTO public.dwell_sessions
    (user_id, camera_id, zone_id, track_key, started_at, last_seen_at, detections, peak_confidence)
  VALUES (_user_id, _camera_id, _zone_id, _track_key, _observed_at, _observed_at, 1, _confidence)
  RETURNING id INTO new_id;

  RETURN jsonb_build_object('ok', true, 'session_id', new_id, 'action', 'opened');
END;
$$;

REVOKE ALL ON FUNCTION public.record_dwell_observation(uuid, uuid, uuid, text, numeric, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_dwell_observation(uuid, uuid, uuid, text, numeric, timestamptz)
  TO service_role;

CREATE OR REPLACE FUNCTION public.close_stale_dwell_sessions()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pol    record;
  closed int;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);
  SELECT * INTO pol FROM public.dwell_policy();

  UPDATE public.dwell_sessions
     SET ended_at = last_seen_at
   WHERE ended_at IS NULL
     AND (now() - last_seen_at > make_interval(secs => pol.gap_seconds)
          OR now() - started_at > make_interval(secs => pol.max_open_seconds));
  GET DIAGNOSTICS closed = ROW_COUNT;

  RETURN jsonb_build_object('closed', closed);
END;
$$;

REVOKE ALL ON FUNCTION public.close_stale_dwell_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_stale_dwell_sessions() TO service_role;

-- ----------------------------------------------------------------------------
-- Alerta de permanência: limite em segundos por zona.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_dwell_alerts(_threshold_seconds int DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pol       record;
  threshold int;
  rec       record;
  emitted   int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);
  SELECT * INTO pol FROM public.dwell_policy();
  threshold := GREATEST(COALESCE(_threshold_seconds, pol.min_dwell_seconds), pol.min_dwell_seconds);

  FOR rec IN
    SELECT s.id, s.user_id, s.camera_id, s.zone_id, s.started_at, s.last_seen_at, s.detections,
           EXTRACT(EPOCH FROM (s.last_seen_at - s.started_at))::int AS dwell_seconds,
           c.name AS camera_name, z.name AS zone_name
      FROM public.dwell_sessions s
      JOIN public.cameras c ON c.id = s.camera_id
      LEFT JOIN public.zones z ON z.id = s.zone_id
     WHERE s.alerted_at IS NULL
       AND s.detections >= pol.min_detections
       AND s.last_seen_at - s.started_at >= make_interval(secs => threshold)
     FOR UPDATE OF s
  LOOP
    -- Anti-repetição: mesma câmera/zona não alerta de novo dentro do cooldown.
    IF EXISTS (
      SELECT 1 FROM public.dwell_sessions p
       WHERE p.camera_id = rec.camera_id
         AND p.zone_id IS NOT DISTINCT FROM rec.zone_id
         AND p.alerted_at IS NOT NULL
         AND p.alerted_at > now() - make_interval(secs => pol.alert_cooldown_seconds)
    ) THEN
      UPDATE public.dwell_sessions SET alerted_at = now() WHERE id = rec.id;
      CONTINUE;
    END IF;

    INSERT INTO public.alerts (camera_id, camera_name, type, severity, message, user_id, timestamp)
    VALUES (
      rec.camera_id, rec.camera_name, 'security', 'high',
      format('Permanência suspeita de %ss em %s',
             rec.dwell_seconds, COALESCE(rec.zone_name, rec.camera_name)),
      rec.user_id, rec.last_seen_at
    );

    UPDATE public.dwell_sessions SET alerted_at = now() WHERE id = rec.id;
    emitted := emitted + 1;
  END LOOP;

  RETURN jsonb_build_object('emitted', emitted, 'threshold_seconds', threshold);
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_dwell_alerts(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_dwell_alerts(int) TO service_role;

-- ----------------------------------------------------------------------------
-- Veículo recorrente: N passagens distintas na janela deslizante.
-- Releituras da MESMA passagem (dentro de same_pass_seconds) não contam.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_vehicle_recurrence(
  _window_minutes int DEFAULT NULL,
  _min_passes     int DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  pol      record;
  win_min  int;
  min_pass int;
  rec      record;
  emitted  int := 0;
  skipped  int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '30s', true);
  SELECT * INTO pol FROM public.vehicle_recurrence_policy();
  win_min  := GREATEST(COALESCE(_window_minutes, pol.window_minutes), 1);
  min_pass := GREATEST(COALESCE(_min_passes, pol.min_passes), 2);

  FOR rec IN
    WITH reads AS (
      SELECT d.user_id,
             upper(trim(d.plate)) AS plate,
             d.camera_id,
             d.camera_name,
             COALESCE(d."timestamp", d.created_at) AS seen_at
        FROM public.plate_detections d
       WHERE COALESCE(d."timestamp", d.created_at) > now() - make_interval(mins => win_min)
         AND d.plate IS NOT NULL
         AND length(trim(d.plate)) >= 5
         AND COALESCE(d.confidence, 0) >= pol.min_confidence
    ),
    marked AS (
      SELECT r.*,
             CASE
               WHEN lag(r.seen_at) OVER (PARTITION BY r.user_id, r.plate ORDER BY r.seen_at) IS NULL
                 OR r.seen_at - lag(r.seen_at) OVER (PARTITION BY r.user_id, r.plate ORDER BY r.seen_at)
                    > make_interval(secs => pol.same_pass_seconds)
               THEN 1 ELSE 0
             END AS is_new_pass
        FROM reads r
    )
    SELECT user_id, plate,
           sum(is_new_pass)::int AS passes,
           count(DISTINCT camera_id)::int AS cameras,
           max(seen_at) AS last_seen,
           (array_agg(camera_id ORDER BY seen_at DESC))[1] AS last_camera_id,
           (array_agg(camera_name ORDER BY seen_at DESC))[1] AS last_camera_name
      FROM marked
     GROUP BY user_id, plate
    HAVING sum(is_new_pass) >= min_pass
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.alerts a
       WHERE a.user_id = rec.user_id
         AND a.type = 'recurrent_vehicle'
         AND a.message LIKE '%' || rec.plate || '%'
         AND a.created_at > now() - make_interval(mins => pol.alert_cooldown_minutes)
    ) THEN
      skipped := skipped + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.alerts (camera_id, camera_name, type, severity, message, user_id, timestamp)
    VALUES (
      rec.last_camera_id, rec.last_camera_name, 'recurrent_vehicle',
      CASE WHEN EXISTS (
        SELECT 1 FROM public.registered_plates p
         WHERE p.user_id = rec.user_id AND upper(trim(p.plate)) = rec.plate
           AND p.is_active AND p.list_type = 'blacklist'
      ) THEN 'critical' ELSE 'high' END,
      format('Veículo recorrente %s: %s passagens em %s min (%s câmera(s))',
             rec.plate, rec.passes, win_min, rec.cameras),
      rec.user_id, rec.last_seen
    );
    emitted := emitted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'emitted', emitted, 'skipped', skipped,
    'window_minutes', win_min, 'min_passes', min_pass
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_vehicle_recurrence(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_vehicle_recurrence(int, int) TO service_role;