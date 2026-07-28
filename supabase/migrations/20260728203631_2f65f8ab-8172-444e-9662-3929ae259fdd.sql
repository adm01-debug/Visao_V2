-- Onda 225 — espelho SQL do veredito "está armado agora?" (src/lib/alarms/armedNow.ts).
--
-- Por que no banco: a tela já sabe responder, mas quem dispara alarme é o
-- servidor. Sem este espelho, o motor dispararia fora da janela e a tela
-- diria "fora da janela" — a contradição mais perigosa possível neste módulo.
--
-- Leis espelhadas: N1 (desabilitado vence agenda), N2 (inoperante nunca é
-- armado), N3 (degradado dentro da janela continua valendo), N4 (agenda vazia
-- é 24x7), N6 (relógio ausente é indeterminado), N7 (fuso explícito).

CREATE OR REPLACE FUNCTION public.alarm_scheme_armed_state(
  p_schedule jsonb,
  p_enabled boolean,
  p_health text,
  p_at timestamptz,
  p_tz_offset_minutes integer DEFAULT 0
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_local     timestamp;
  v_weekday   integer;
  v_minute    integer;
  v_prev      integer;
  v_period    jsonb;
  v_start     integer;
  v_end       integer;
  v_covered   boolean := false;
  v_declared  boolean := false;
  v_day       integer;
BEGIN
  -- N6 — sem relógio não se afirma ausência de vigilância.
  IF p_at IS NULL OR p_tz_offset_minutes IS NULL THEN
    RETURN 'unknown';
  END IF;

  -- N1 — cadastro desligado vence qualquer agenda.
  IF p_enabled IS NOT TRUE THEN
    RETURN 'off';
  END IF;

  -- N2 — inoperante jamais se apresenta como armado.
  IF p_health = 'inoperative' THEN
    RETURN 'inoperative';
  END IF;

  -- Existe alguma janela declarada? Agenda ausente/vazia é 24x7 (N4).
  IF p_schedule IS NOT NULL
     AND jsonb_typeof(p_schedule) = 'array'
     AND jsonb_array_length(p_schedule) = 7 THEN
    FOR v_day IN 0..6 LOOP
      IF jsonb_typeof(p_schedule -> v_day) = 'array'
         AND jsonb_array_length(p_schedule -> v_day) > 0 THEN
        v_declared := true;
      END IF;
    END LOOP;
  END IF;

  IF NOT v_declared THEN
    RETURN CASE WHEN p_health = 'inconsistent' THEN 'armed_degraded' ELSE 'armed' END;
  END IF;

  -- N7 — o fuso é dado, nunca o do servidor.
  v_local   := (p_at AT TIME ZONE 'UTC') + make_interval(mins => p_tz_offset_minutes);
  v_weekday := EXTRACT(dow FROM v_local)::integer;
  v_minute  := EXTRACT(hour FROM v_local)::integer * 60 + EXTRACT(minute FROM v_local)::integer;
  v_prev    := (v_weekday + 6) % 7;

  FOR v_period IN SELECT jsonb_array_elements(p_schedule -> v_weekday) LOOP
    IF jsonb_typeof(v_period -> 'startMin') <> 'number'
       OR jsonb_typeof(v_period -> 'endMin') <> 'number' THEN
      CONTINUE;
    END IF;
    v_start := (v_period ->> 'startMin')::numeric::integer;
    v_end   := (v_period ->> 'endMin')::numeric::integer;
    IF v_start = v_end THEN
      CONTINUE; -- período degenerado é descartado, como na normalização TS.
    END IF;
    IF v_start < v_end THEN
      IF v_minute >= v_start AND v_minute < v_end THEN
        v_covered := true;
      END IF;
    ELSIF v_minute >= v_start THEN
      v_covered := true; -- janela que cruza a meia-noite, trecho de hoje.
    END IF;
  END LOOP;

  IF NOT v_covered THEN
    -- Continuação, no dia anterior, das janelas que cruzam a meia-noite.
    FOR v_period IN SELECT jsonb_array_elements(p_schedule -> v_prev) LOOP
      IF jsonb_typeof(v_period -> 'startMin') <> 'number'
         OR jsonb_typeof(v_period -> 'endMin') <> 'number' THEN
        CONTINUE;
      END IF;
      v_start := (v_period ->> 'startMin')::numeric::integer;
      v_end   := (v_period ->> 'endMin')::numeric::integer;
      IF v_start > v_end AND v_minute < v_end THEN
        v_covered := true;
      END IF;
    END LOOP;
  END IF;

  IF v_covered THEN
    -- N3 — degradado dentro da janela continua valendo, com ressalva.
    RETURN CASE WHEN p_health = 'inconsistent' THEN 'armed_degraded' ELSE 'armed' END;
  END IF;

  RETURN 'idle';
END;
$$;

COMMENT ON FUNCTION public.alarm_scheme_armed_state(jsonb, boolean, text, timestamptz, integer)
  IS 'Onda 225: espelho SQL de evaluateArmedNow (N1-N4, N6, N7). Estados: armed, armed_degraded, idle, off, inoperative, unknown.';

-- Porta única para o motor de alarme: só dispara quando a vigilância vale.
-- Indeterminado NÃO libera disparo (falta de informação nunca autoriza ação).
CREATE OR REPLACE FUNCTION public.alarm_scheme_is_armed(
  p_schedule jsonb,
  p_enabled boolean,
  p_health text,
  p_at timestamptz,
  p_tz_offset_minutes integer DEFAULT 0
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT public.alarm_scheme_armed_state(p_schedule, p_enabled, p_health, p_at, p_tz_offset_minutes)
         IN ('armed', 'armed_degraded');
$$;

COMMENT ON FUNCTION public.alarm_scheme_is_armed(jsonb, boolean, text, timestamptz, integer)
  IS 'Onda 225: sim/não para disparo. Indeterminado não autoriza.';

-- Exercício dinâmico: gate estático não prova execução (lição da Onda 141).
CREATE OR REPLACE FUNCTION public.alarm_armed_state_selftest()
RETURNS TABLE(case_name text, expected text, actual text, ok boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Segunda-feira 2026-07-27.
  mon10   constant timestamptz := '2026-07-27 10:00:00+00';
  mon2330 constant timestamptz := '2026-07-27 23:30:00+00';
  tue0300 constant timestamptz := '2026-07-28 03:00:00+00';
  win     constant jsonb := '[[],[{"startMin":480,"endMin":600}],[],[],[],[],[]]';
  cross_m constant jsonb := '[[],[{"startMin":1320,"endMin":360}],[],[],[],[],[]]';
  empty7  constant jsonb := '[[],[],[],[],[],[],[]]';
  cases   text[][] := ARRAY[]::text[][];
BEGIN
  RETURN QUERY
  WITH probes(case_name, expected, actual) AS (
    VALUES
      ('N1 desabilitado dentro da janela', 'off',
        public.alarm_scheme_armed_state(NULL, false, 'ok', mon10, 0)),
      ('N2 inoperante 24x7', 'inoperative',
        public.alarm_scheme_armed_state(NULL, true, 'inoperative', mon10, 0)),
      ('N2 inoperante vence a janela aberta', 'inoperative',
        public.alarm_scheme_armed_state(win, true, 'inoperative', '2026-07-27 09:00:00+00', 0)),
      ('N3 degradado dentro da janela', 'armed_degraded',
        public.alarm_scheme_armed_state(win, true, 'inconsistent', '2026-07-27 09:00:00+00', 0)),
      ('N3 degradado fora da janela', 'idle',
        public.alarm_scheme_armed_state(win, true, 'inconsistent', mon10, 0)),
      ('N4 agenda nula é 24x7', 'armed',
        public.alarm_scheme_armed_state(NULL, true, 'ok', mon10, 0)),
      ('N4 agenda de 7 dias vazios é 24x7', 'armed',
        public.alarm_scheme_armed_state(empty7, true, 'ok', mon10, 0)),
      ('janela aberta', 'armed',
        public.alarm_scheme_armed_state(win, true, 'ok', '2026-07-27 08:00:00+00', 0)),
      ('borda de fechamento é exclusiva', 'idle',
        public.alarm_scheme_armed_state(win, true, 'ok', mon10, 0)),
      ('borda de abertura é inclusiva', 'armed',
        public.alarm_scheme_armed_state(win, true, 'ok', '2026-07-27 08:00:00+00', 0)),
      ('N6 relógio ausente é indeterminado', 'unknown',
        public.alarm_scheme_armed_state(NULL, true, 'ok', NULL, 0)),
      ('N7 fuso desloca o veredito', 'armed',
        public.alarm_scheme_armed_state(win, true, 'ok', mon10, -120)),
      ('meia-noite: trecho do dia da abertura', 'armed',
        public.alarm_scheme_armed_state(cross_m, true, 'ok', mon2330, 0)),
      ('meia-noite: continuação na madrugada seguinte', 'armed',
        public.alarm_scheme_armed_state(cross_m, true, 'ok', tue0300, 0)),
      ('meia-noite: depois do fechamento', 'idle',
        public.alarm_scheme_armed_state(cross_m, true, 'ok', '2026-07-28 06:30:00+00', 0)),
      ('disparo negado quando indeterminado', 'false',
        public.alarm_scheme_is_armed(NULL, true, 'ok', NULL, 0)::text),
      ('disparo permitido com ressalva', 'true',
        public.alarm_scheme_is_armed(win, true, 'inconsistent', '2026-07-27 09:00:00+00', 0)::text)
  )
  SELECT p.case_name, p.expected, p.actual, p.actual IS NOT DISTINCT FROM p.expected FROM probes p;
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_armed_state_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alarm_armed_state_selftest() FROM anon;

COMMENT ON FUNCTION public.alarm_armed_state_selftest()
  IS 'Onda 225: exercício dinâmico do espelho de armamento (17 fronteiras).';