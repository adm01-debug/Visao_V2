-- Onda 242 — Trilha do ruído evitado: persistência dos silêncios por condição.

CREATE TABLE IF NOT EXISTS public.maintenance_dispatch_suppressions (
  id                bigserial   PRIMARY KEY,
  alert_id          uuid,
  condition_key     text        NOT NULL,
  channel           text        NOT NULL,
  severity          text        NOT NULL,
  last_severity     text,
  window_minutes    integer     NOT NULL,
  remaining_minutes integer     NOT NULL,
  suppressed_at     timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_dispatch_suppressions_condition_chk
    CHECK (length(btrim(condition_key)) > 0),
  CONSTRAINT maintenance_dispatch_suppressions_channel_chk
    CHECK (channel IN ('telegram','email')),
  CONSTRAINT maintenance_dispatch_suppressions_severity_chk
    CHECK (severity IN ('warning','critical')),
  CONSTRAINT maintenance_dispatch_suppressions_last_severity_chk
    CHECK (last_severity IS NULL OR last_severity IN ('warning','critical')),
  CONSTRAINT maintenance_dispatch_suppressions_window_chk
    CHECK (window_minutes > 0 AND window_minutes <= 43200),
  CONSTRAINT maintenance_dispatch_suppressions_remaining_chk
    CHECK (remaining_minutes >= 0 AND remaining_minutes <= window_minutes)
);

CREATE INDEX IF NOT EXISTS maintenance_dispatch_suppressions_recent_idx
  ON public.maintenance_dispatch_suppressions (suppressed_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS maintenance_dispatch_suppressions_condition_idx
  ON public.maintenance_dispatch_suppressions (condition_key, suppressed_at DESC);

REVOKE ALL ON TABLE public.maintenance_dispatch_suppressions FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.maintenance_dispatch_suppressions TO service_role;
REVOKE ALL ON SEQUENCE public.maintenance_dispatch_suppressions_id_seq FROM PUBLIC, anon, authenticated;
GRANT ALL ON SEQUENCE public.maintenance_dispatch_suppressions_id_seq TO service_role;

ALTER TABLE public.maintenance_dispatch_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_dispatch_suppressions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trilha de supressao inacessivel por Data API"
  ON public.maintenance_dispatch_suppressions;
CREATE POLICY "trilha de supressao inacessivel por Data API"
  ON public.maintenance_dispatch_suppressions
  AS RESTRICTIVE FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.block_dispatch_suppression_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'maintenance_dispatch_suppressions e append-only (% recusado)', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_block_dispatch_suppression_mutation
  ON public.maintenance_dispatch_suppressions;
CREATE TRIGGER trg_block_dispatch_suppression_mutation
  BEFORE UPDATE OR DELETE ON public.maintenance_dispatch_suppressions
  FOR EACH ROW EXECUTE FUNCTION public.block_dispatch_suppression_mutation();

CREATE OR REPLACE FUNCTION public.maintenance_suppression_ledger(p_window_hours integer DEFAULT 168)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_window int := LEAST(GREATEST(COALESCE(p_window_hours, 168), 1), 8760);
  v_floor  timestamptz;
  v_rows   jsonb;
  v_deliv  jsonb;
  v_total  bigint;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'apenas administradores podem ler a trilha de supressao'
      USING ERRCODE = '42501';
  END IF;

  v_floor := now() - make_interval(hours => v_window);

  SELECT count(*) INTO v_total
  FROM public.maintenance_dispatch_suppressions
  WHERE suppressed_at >= v_floor;

  SELECT COALESCE(jsonb_agg(x), '[]'::jsonb)
    INTO v_rows
  FROM (
    SELECT jsonb_build_object(
             'condition_key',  s.condition_key,
             'channel',        s.channel,
             'severity',       s.severity,
             'window_minutes', s.window_minutes,
             'suppressed_at',  s.suppressed_at
           ) AS x
    FROM public.maintenance_dispatch_suppressions s
    WHERE s.suppressed_at >= v_floor
    ORDER BY s.suppressed_at DESC
    LIMIT 2001
  ) q;

  SELECT COALESCE(jsonb_agg(y), '[]'::jsonb)
    INTO v_deliv
  FROM (
    SELECT jsonb_build_object(
             'condition_key', e.routine,
             'channel',       d.channel,
             'sent_at',       d.last_attempt_at
           ) AS y
    FROM public.maintenance_alert_dispatches d
    JOIN public.maintenance_alert_events e ON e.id = d.alert_id
    WHERE d.status = 'sent'
      AND d.last_attempt_at >= v_floor
    ORDER BY d.last_attempt_at DESC
    LIMIT 2000
  ) q2;

  RETURN jsonb_build_object(
    'window_hours', v_window,
    'total',        v_total,
    'rows',         v_rows,
    'deliveries',   v_deliv,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.maintenance_suppression_ledger(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.maintenance_suppression_ledger(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.maintenance_suppression_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_id   bigint;
  v_out  jsonb := '{}'::jsonb;
  v_ok   boolean;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'apenas administradores' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.maintenance_dispatch_suppressions
    (condition_key, channel, severity, last_severity, window_minutes, remaining_minutes)
  VALUES ('selftest:condition', 'telegram', 'critical', 'critical', 1440, 900)
  RETURNING id INTO v_id;
  v_out := v_out || jsonb_build_object('insert_ok', v_id IS NOT NULL);

  BEGIN
    INSERT INTO public.maintenance_dispatch_suppressions
      (condition_key, channel, severity, window_minutes, remaining_minutes)
    VALUES ('selftest:condition', 'telegram', 'critical', 0, 0);
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_out := v_out || jsonb_build_object('rejects_zero_window', v_ok);

  BEGIN
    INSERT INTO public.maintenance_dispatch_suppressions
      (condition_key, channel, severity, window_minutes, remaining_minutes)
    VALUES ('selftest:condition', 'email', 'warning', 60, 61);
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_out := v_out || jsonb_build_object('rejects_remaining_gt_window', v_ok);

  BEGIN
    INSERT INTO public.maintenance_dispatch_suppressions
      (condition_key, channel, severity, window_minutes, remaining_minutes)
    VALUES ('selftest:condition', 'sms', 'warning', 60, 10);
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_out := v_out || jsonb_build_object('rejects_unknown_channel', v_ok);

  BEGIN
    UPDATE public.maintenance_dispatch_suppressions
       SET remaining_minutes = 1 WHERE id = v_id;
    v_ok := false;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  v_out := v_out || jsonb_build_object('rejects_update', v_ok);

  BEGIN
    DELETE FROM public.maintenance_dispatch_suppressions WHERE id = v_id;
    v_ok := false;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  v_out := v_out || jsonb_build_object('rejects_delete', v_ok);

  ALTER TABLE public.maintenance_dispatch_suppressions DISABLE TRIGGER trg_block_dispatch_suppression_mutation;
  DELETE FROM public.maintenance_dispatch_suppressions WHERE condition_key = 'selftest:condition';
  ALTER TABLE public.maintenance_dispatch_suppressions ENABLE TRIGGER trg_block_dispatch_suppression_mutation;

  RETURN v_out || jsonb_build_object('cleaned', true);
END;
$$;

REVOKE ALL ON FUNCTION public.maintenance_suppression_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.maintenance_suppression_selftest() TO service_role;