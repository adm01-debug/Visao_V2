-- ROLLBACK:
--   Restaura a definicao anterior, que falha com attempt >= 31:
--     CREATE OR REPLACE FUNCTION public.evaluate_and_restart_streams() ... ;
--   com a linha `v_wait_min := LEAST(60, GREATEST(1, POWER(2, v_last_attempt)::INTEGER));`
--   e SEM `SECURITY DEFINER` (o original de 20260721224954:61 tinha).
--   Reverter volta a quebrar o job quando uma camera acumula restarts, entao so
--   use se precisar comparar com o comportamento antigo.

BEGIN;

CREATE OR REPLACE FUNCTION public.evaluate_and_restart_streams()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
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

-- Fecha a ACL que a definicao original aplicava (20260721224954:117-118).
-- CREATE OR REPLACE FUNCTION preserva a ACL antiga, mas o original revogava
-- PUBLIC: sem isto qualquer usuario logado executa o restart.
REVOKE ALL ON FUNCTION public.evaluate_and_restart_streams() FROM public, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.evaluate_and_restart_streams() TO service_role;

COMMIT;
