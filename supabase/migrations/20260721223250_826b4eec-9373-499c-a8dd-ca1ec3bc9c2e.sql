
-- Onda Shinobi 4 — Camera Schedules

CREATE TABLE public.camera_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 100),
  scope TEXT NOT NULL CHECK (scope IN ('camera','group','all')),
  camera_id UUID REFERENCES public.cameras(id) ON DELETE CASCADE,
  group_id UUID REFERENCES public.monitor_groups(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('arm','disarm')),
  cron_expression TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_status TEXT CHECK (last_status IN ('ok','error','skipped')),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT sched_scope_camera CHECK (
    (scope <> 'camera') OR (camera_id IS NOT NULL AND group_id IS NULL)
  ),
  CONSTRAINT sched_scope_group CHECK (
    (scope <> 'group') OR (group_id IS NOT NULL AND camera_id IS NULL)
  ),
  CONSTRAINT sched_scope_all CHECK (
    (scope <> 'all') OR (camera_id IS NULL AND group_id IS NULL)
  ),
  CONSTRAINT sched_cron_shape CHECK (
    cron_expression ~ '^\s*\S+\s+\S+\s+\S+\s+\S+\s+\S+\s*$'
  )
);
CREATE INDEX idx_camera_schedules_user ON public.camera_schedules(user_id);
CREATE INDEX idx_camera_schedules_enabled ON public.camera_schedules(enabled) WHERE enabled = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_schedules TO authenticated;
GRANT ALL ON public.camera_schedules TO service_role;
ALTER TABLE public.camera_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_select_own" ON public.camera_schedules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "cs_insert_own" ON public.camera_schedules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cs_update_own" ON public.camera_schedules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cs_delete_own" ON public.camera_schedules FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_camera_schedules_updated_at BEFORE UPDATE ON public.camera_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Histórico
CREATE TABLE public.camera_schedule_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  schedule_id UUID NOT NULL REFERENCES public.camera_schedules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL CHECK (status IN ('ok','error','skipped')),
  affected_cameras INT NOT NULL DEFAULT 0,
  error TEXT
);
CREATE INDEX idx_csr_schedule ON public.camera_schedule_runs(schedule_id, ran_at DESC);
CREATE INDEX idx_csr_user ON public.camera_schedule_runs(user_id, ran_at DESC);

GRANT SELECT ON public.camera_schedule_runs TO authenticated;
GRANT ALL ON public.camera_schedule_runs TO service_role;
ALTER TABLE public.camera_schedule_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csr_select_own" ON public.camera_schedule_runs FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- INSERTs feitos apenas via SECURITY DEFINER function; nenhuma policy de write no-op para authenticated.

-- Parser de cron (5 campos: min hr dom mon dow) usado para verificar match com o minuto atual
CREATE OR REPLACE FUNCTION public.cron_matches(expr TEXT, ts TIMESTAMPTZ, tz TEXT DEFAULT 'UTC')
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  local_ts TIMESTAMP := (ts AT TIME ZONE tz);
  parts TEXT[] := regexp_split_to_array(btrim(expr), '\s+');
  target INT;
  field TEXT;
  match BOOLEAN;
  part TEXT;
  step INT;
  range_str TEXT;
  lo INT;
  hi INT;
  v INT;
  ranges INT[][] := ARRAY[ARRAY[0,59], ARRAY[0,23], ARRAY[1,31], ARRAY[1,12], ARRAY[0,6]];
  targets INT[] := ARRAY[
    EXTRACT(MINUTE FROM local_ts)::INT,
    EXTRACT(HOUR FROM local_ts)::INT,
    EXTRACT(DAY FROM local_ts)::INT,
    EXTRACT(MONTH FROM local_ts)::INT,
    EXTRACT(DOW FROM local_ts)::INT
  ];
  i INT;
BEGIN
  IF array_length(parts, 1) <> 5 THEN RETURN FALSE; END IF;
  FOR i IN 1..5 LOOP
    field := parts[i];
    target := targets[i];
    match := FALSE;
    FOREACH part IN ARRAY string_to_array(field, ',') LOOP
      step := 1;
      range_str := part;
      IF position('/' IN part) > 0 THEN
        step := split_part(part, '/', 2)::INT;
        range_str := split_part(part, '/', 1);
        IF step < 1 THEN RETURN FALSE; END IF;
      END IF;
      IF range_str = '*' THEN
        lo := ranges[i][1]; hi := ranges[i][2];
      ELSIF position('-' IN range_str) > 0 THEN
        lo := split_part(range_str, '-', 1)::INT;
        hi := split_part(range_str, '-', 2)::INT;
      ELSE
        lo := range_str::INT; hi := lo;
      END IF;
      IF lo < ranges[i][1] OR hi > ranges[i][2] OR lo > hi THEN RETURN FALSE; END IF;
      v := lo;
      WHILE v <= hi LOOP
        IF v = target THEN match := TRUE; EXIT; END IF;
        v := v + step;
      END LOOP;
      IF match THEN EXIT; END IF;
    END LOOP;
    IF NOT match THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
END $$;

-- Resolve escopo → lista de camera_ids do usuário
CREATE OR REPLACE FUNCTION public.resolve_schedule_cameras(_user_id UUID, _scope TEXT, _camera_id UUID, _group_id UUID)
RETURNS SETOF UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id FROM public.cameras c WHERE c.user_id = _user_id AND (
    (_scope = 'all')
    OR (_scope = 'camera' AND c.id = _camera_id)
    OR (_scope = 'group' AND c.id IN (
      SELECT mgc.camera_id FROM public.monitor_group_cameras mgc
      WHERE mgc.group_id = _group_id AND mgc.user_id = _user_id
    ))
  )
$$;

-- Runner: chamado pelo pg_cron a cada minuto
CREATE OR REPLACE FUNCTION public.execute_camera_schedules()
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  sched RECORD;
  cams UUID[];
  affected INT := 0;
  run_status TEXT;
  run_error TEXT;
  total INT := 0;
BEGIN
  FOR sched IN
    SELECT * FROM public.camera_schedules
    WHERE enabled = true
      AND public.cron_matches(cron_expression, now(), timezone)
  LOOP
    run_status := 'ok'; run_error := NULL; affected := 0;
    BEGIN
      SELECT array_agg(id) INTO cams FROM public.resolve_schedule_cameras(
        sched.user_id, sched.scope, sched.camera_id, sched.group_id
      );
      IF cams IS NULL OR array_length(cams, 1) IS NULL THEN
        run_status := 'skipped';
      ELSE
        INSERT INTO public.arm_disarm_states (user_id, camera_id, state, armed_at, armed_by_email, updated_at)
        SELECT sched.user_id, c, CASE WHEN sched.action='arm' THEN 'armed' ELSE 'disarmed' END,
               CASE WHEN sched.action='arm' THEN now() ELSE NULL END,
               'schedule:' || sched.id::TEXT, now()
        FROM unnest(cams) c
        ON CONFLICT (camera_id) DO UPDATE
          SET state = EXCLUDED.state,
              armed_at = EXCLUDED.armed_at,
              armed_by_email = EXCLUDED.armed_by_email,
              updated_at = now();
        affected := array_length(cams, 1);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      run_status := 'error'; run_error := SQLERRM;
    END;

    INSERT INTO public.camera_schedule_runs (schedule_id, user_id, status, affected_cameras, error)
    VALUES (sched.id, sched.user_id, run_status, affected, run_error);

    UPDATE public.camera_schedules
      SET last_run_at = now(), last_status = run_status, last_error = run_error
      WHERE id = sched.id;

    total := total + 1;
  END LOOP;
  RETURN total;
END $$;

REVOKE EXECUTE ON FUNCTION public.execute_camera_schedules() FROM PUBLIC, anon, authenticated;

-- arm_disarm_states precisa de UNIQUE(camera_id) para o ON CONFLICT acima.
-- Se já existir, o CREATE UNIQUE INDEX IF NOT EXISTS é idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_arm_disarm_camera ON public.arm_disarm_states(camera_id);

-- Agenda o tick de 1 min via pg_cron (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'camera-schedules-tick';
    PERFORM cron.schedule('camera-schedules-tick', '* * * * *', 'SELECT public.execute_camera_schedules();');
  END IF;
END $$;
