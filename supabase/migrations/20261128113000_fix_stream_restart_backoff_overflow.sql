-- `evaluate_and_restart_streams()` calcula espera exponencial com
-- `POWER(2, attempt)::INTEGER`. Uma camera que falha em sequencia chega a
-- attempt 31 e `2^31 = 2147483648` estoura o INTEGER: o job inteiro aborta
-- com "integer out of range" e nenhuma das outras cameras e avaliada. Medido
-- em producao: 141 execucoes falhas em 6h, max(attempt) = 31.
--
-- O teto real do LEAST e 60 minutos, alcancado em attempt 6; a partir dai o
-- expoente nao muda mais o resultado. O LEAST aplicado ao expoente (e nao ao
-- resultado) mantem a intencao original e elimina o overflow.
CREATE OR REPLACE FUNCTION public.evaluate_and_restart_streams()
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
    v_wait_min := LEAST(60, GREATEST(1, POWER(2, LEAST(v_last_attempt, 6))::INTEGER));

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
$function$;
