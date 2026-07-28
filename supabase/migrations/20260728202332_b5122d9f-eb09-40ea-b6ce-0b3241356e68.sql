-- Onda 221 — espelho SQL da lei S8 (agenda semanal).
-- O banco é a última linha: a UI já recusa (G1-G8), mas um cliente que fale
-- direto com a API não pode gravar agenda que o avaliador leria de forma
-- diferente do que foi mostrado ao operador.

CREATE OR REPLACE FUNCTION public.alarm_schedule_refusal(p_schedule jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_day        integer;
  v_periods    jsonb;
  v_period     jsonb;
  v_start      integer;
  v_end        integer;
  v_count      integer;
  v_intervals  int4range[];
  v_iv         int4range;
  v_existing   int4range;
BEGIN
  -- Agenda ausente é 24x7 declarado (G1), não configuração faltando.
  IF p_schedule IS NULL OR jsonb_typeof(p_schedule) = 'null' THEN
    RETURN NULL;
  END IF;

  IF jsonb_typeof(p_schedule) <> 'array' OR jsonb_array_length(p_schedule) <> 7 THEN
    RETURN 'a agenda precisa ter exatamente 7 dias';
  END IF;

  FOR v_day IN 0..6 LOOP
    v_periods := p_schedule -> v_day;
    IF jsonb_typeof(v_periods) <> 'array' THEN
      RETURN format('dia %s: lista de períodos malformada', v_day);
    END IF;

    v_count := jsonb_array_length(v_periods);
    IF v_count > 6 THEN
      RETURN format('dia %s: %s períodos excedem o teto de 6 por dia', v_day, v_count);
    END IF;

    v_intervals := ARRAY[]::int4range[];

    FOR v_period IN SELECT jsonb_array_elements(v_periods) LOOP
      IF jsonb_typeof(v_period) <> 'object'
         OR jsonb_typeof(v_period -> 'startMin') <> 'number'
         OR jsonb_typeof(v_period -> 'endMin') <> 'number' THEN
        RETURN format('dia %s: período malformado', v_day);
      END IF;

      v_start := (v_period ->> 'startMin')::numeric::integer;
      v_end   := (v_period ->> 'endMin')::numeric::integer;

      IF (v_period ->> 'startMin')::numeric <> v_start
         OR (v_period ->> 'endMin')::numeric <> v_end THEN
        RETURN format('dia %s: minutos precisam ser inteiros', v_day);
      END IF;
      IF v_start < 0 OR v_start >= 1440 THEN
        RETURN format('dia %s: início fora de 00:00–23:59', v_day);
      END IF;
      IF v_end <= 0 OR v_end > 1440 THEN
        RETURN format('dia %s: término fora de 00:01–24:00', v_day);
      END IF;
      IF v_start = v_end THEN
        RETURN format('dia %s: período de duração zero é ambíguo', v_day);
      END IF;

      -- Cruzamento da meia-noite vira dois trechos no eixo do dia (G4),
      -- exatamente como `expandPeriod` no TypeScript.
      IF v_start < v_end THEN
        FOREACH v_existing IN ARRAY v_intervals LOOP
          IF v_existing && int4range(v_start, v_end) THEN
            RETURN format('dia %s: períodos se sobrepõem', v_day);
          END IF;
        END LOOP;
        v_intervals := v_intervals || int4range(v_start, v_end);
      ELSE
        FOREACH v_iv IN ARRAY ARRAY[int4range(v_start, 1440), int4range(0, v_end)] LOOP
          FOREACH v_existing IN ARRAY v_intervals LOOP
            IF v_existing && v_iv THEN
              RETURN format('dia %s: períodos se sobrepõem', v_day);
            END IF;
          END LOOP;
          v_intervals := v_intervals || v_iv;
        END LOOP;
      END IF;
    END LOOP;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_schedule_refusal(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.alarm_schedule_refusal(jsonb) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.enforce_alarm_scheme_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_schedule_refusal TEXT;
BEGIN
  -- S5
  v_total := public.alarm_scheme_channel_total(NEW.actions);
  IF v_total > 36 THEN
    RAISE EXCEPTION
      'alarm_scheme_channel_budget_exceeded: % canais (exibidos + gravados) excedem o teto de 36 por evento', v_total
      USING ERRCODE = '23514';
  END IF;

  -- S6: face_recognized exige exatamente uma biblioteca
  IF NEW.event_type = 'face_recognized'
     AND COALESCE(array_length(NEW.face_library_ids, 1), 0) <> 1 THEN
    RAISE EXCEPTION
      'alarm_scheme_face_library_required: "Face reconhecida" exige exatamente uma biblioteca de faces'
      USING ERRCODE = '23514';
  END IF;

  -- S8 (Onda 221): agenda semanal coerente
  v_schedule_refusal := public.alarm_schedule_refusal(NEW.schedule);
  IF v_schedule_refusal IS NOT NULL THEN
    RAISE EXCEPTION 'alarm_scheme_schedule_invalid: %', v_schedule_refusal
      USING ERRCODE = '23514';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;