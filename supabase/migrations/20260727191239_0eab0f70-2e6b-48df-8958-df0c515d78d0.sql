-- Onda 147 (correção) — a rotina precisa ser reentrante DENTRO da mesma
-- transação. Sem isso, o exercício em transação revertida (que chama a rotina
-- várias vezes) quebra com "relation _blame_sample already exists" e nós
-- perderíamos justamente a prova dinâmica que o gate exige.
CREATE OR REPLACE FUNCTION public.evaluate_blame_alerts(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  t                record;
  rec              record;
  v_since          timestamptz;
  v_routine        text;
  v_severity       text;
  v_cooldown       int;
  v_owner          text;
  v_emitted        int := 0;
  v_supp_cooldown  int := 0;
  v_supp_sample    int := 0;
  v_supp_silent    int := 0;
  v_truncated      int := 0;
  v_candidates     jsonb := '[]'::jsonb;
  v_cand           jsonb;
  v_idx            int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  SELECT * INTO t FROM public.blame_alert_thresholds();
  v_since := p_now - make_interval(mins => t.window_minutes);

  DROP TABLE IF EXISTS _blame_sample;
  DROP TABLE IF EXISTS _blame_common;
  DROP TABLE IF EXISTS _blame_absorbed;

  CREATE TEMP TABLE _blame_sample ON COMMIT DROP AS
  SELECT a.blame, a.camera_id, a.relay_agent_id, a.function_name
    FROM public.edge_function_error_audit a
   WHERE a.created_at > v_since
     AND a.created_at <= p_now
     AND a.blame IS NOT NULL;

  SELECT count(*) INTO v_supp_silent FROM _blame_sample WHERE blame = 'caller';
  DELETE FROM _blame_sample WHERE public.blame_owner(blame) IS NULL;

  CREATE TEMP TABLE _blame_common ON COMMIT DROP AS
  SELECT relay_agent_id, count(DISTINCT camera_id) AS cameras
    FROM _blame_sample
   WHERE blame = 'device' AND relay_agent_id IS NOT NULL AND camera_id IS NOT NULL
   GROUP BY relay_agent_id
  HAVING count(DISTINCT camera_id) >= t.widespread_cameras;

  CREATE TEMP TABLE _blame_absorbed ON COMMIT DROP AS
  SELECT DISTINCT s.camera_id
    FROM _blame_sample s
    JOIN _blame_common c ON c.relay_agent_id = s.relay_agent_id
   WHERE s.blame = 'device' AND s.camera_id IS NOT NULL;

  FOR rec IN SELECT * FROM _blame_common ORDER BY relay_agent_id LOOP
    v_candidates := v_candidates || jsonb_build_object(
      'routine',  'blame:common-cause:' || rec.relay_agent_id::text,
      'blame',    'transport',
      'owner',    public.blame_owner('transport'),
      'severity', 'critical',
      'scope',    'agent',
      'cameras',  rec.cameras,
      'reason',   format('%s câmeras mudas sob o mesmo agente — caminho compartilhado suspeito', rec.cameras)
    );
  END LOOP;

  FOR rec IN
    SELECT blame,
           count(*)                  AS rows_n,
           count(DISTINCT camera_id) AS cameras_n
      FROM _blame_sample
     GROUP BY blame
     ORDER BY blame
  LOOP
    IF rec.blame NOT IN ('transport', 'cloud', 'unknown')
       AND rec.cameras_n < t.widespread_cameras THEN
      CONTINUE;
    END IF;

    IF rec.rows_n < t.min_rows THEN
      v_supp_sample := v_supp_sample + 1;
      CONTINUE;
    END IF;

    v_severity := CASE
      WHEN rec.blame = 'unknown' THEN 'warning'
      WHEN rec.rows_n >= t.critical_rows OR rec.cameras_n >= t.widespread_cameras THEN 'critical'
      ELSE 'warning'
    END;

    v_candidates := v_candidates || jsonb_build_object(
      'routine',  'blame:' || rec.blame,
      'blame',    rec.blame,
      'owner',    public.blame_owner(rec.blame),
      'severity', v_severity,
      'scope',    'fleet',
      'cameras',  rec.cameras_n,
      'reason',   format('%s falhas atribuídas a %s em %s câmera(s)', rec.rows_n, rec.blame, rec.cameras_n)
    );
  END LOOP;

  FOR rec IN
    SELECT s.blame, s.camera_id, count(*) AS rows_n
      FROM _blame_sample s
     WHERE s.blame NOT IN ('transport', 'cloud', 'unknown')
       AND s.camera_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM _blame_absorbed a WHERE a.camera_id = s.camera_id)
       AND (SELECT count(DISTINCT x.camera_id) FROM _blame_sample x WHERE x.blame = s.blame)
             < t.widespread_cameras
     GROUP BY s.blame, s.camera_id
     ORDER BY s.blame, s.camera_id
  LOOP
    IF rec.rows_n < t.min_rows THEN
      v_supp_sample := v_supp_sample + 1;
      CONTINUE;
    END IF;

    v_candidates := v_candidates || jsonb_build_object(
      'routine',  format('blame:%s:%s', rec.blame, rec.camera_id::text),
      'blame',    rec.blame,
      'owner',    public.blame_owner(rec.blame),
      'severity', CASE WHEN rec.rows_n >= t.critical_rows THEN 'critical' ELSE 'warning' END,
      'scope',    'camera',
      'cameras',  1,
      'reason',   format('%s falhas atribuídas a %s na mesma câmera', rec.rows_n, rec.blame)
    );
  END LOOP;

  SELECT jsonb_agg(c ORDER BY (c->>'severity') <> 'critical', c->>'routine')
    INTO v_candidates
    FROM jsonb_array_elements(v_candidates) c;
  v_candidates := COALESCE(v_candidates, '[]'::jsonb);

  v_truncated := greatest(0, jsonb_array_length(v_candidates) - t.max_alerts_per_run);

  FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates) LOOP
    v_idx := v_idx + 1;
    EXIT WHEN v_idx > t.max_alerts_per_run;

    v_routine  := v_cand->>'routine';
    v_severity := v_cand->>'severity';
    v_owner    := v_cand->>'owner';
    v_cooldown := CASE WHEN v_severity = 'critical'
                       THEN t.cooldown_critical_minutes
                       ELSE t.cooldown_warning_minutes END;

    IF EXISTS (
      SELECT 1 FROM public.maintenance_alert_events e
       WHERE e.routine = v_routine
         AND e.severity = v_severity
         AND e.created_at > p_now - make_interval(mins => v_cooldown)
    ) THEN
      v_supp_cooldown := v_supp_cooldown + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
    VALUES (
      v_routine,
      v_severity,
      v_cand->>'reason',
      jsonb_build_object(
        'blame',            v_cand->>'blame',
        'owner',            v_owner,
        'scope',            v_cand->>'scope',
        'cameras',          (v_cand->>'cameras')::int,
        'window_minutes',   t.window_minutes,
        'cooldown_minutes', v_cooldown
      ),
      p_now
    );
    v_emitted := v_emitted + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'evaluated_at', p_now,
    'emitted',      v_emitted,
    'truncated',    v_truncated,
    'suppressed',   jsonb_build_object(
      'cooldown', v_supp_cooldown,
      'sample',   v_supp_sample,
      'silent',   v_supp_silent
    ),
    'candidates',   v_candidates
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_blame_alerts(timestamptz) FROM PUBLIC, anon, authenticated;