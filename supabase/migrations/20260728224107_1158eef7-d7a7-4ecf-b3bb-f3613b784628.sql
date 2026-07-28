-- ===========================================================================
-- Onda 238 — Perfis de escalada por classe de fonte + âncora na condição.
--
-- Espelho SQL de src/lib/escalationProfiles.ts (leis O1–O10). A régua canônica
-- é o TypeScript; estas funções existem para que o cron aplique exatamente a
-- mesma decisão que a UI exibe, e o gate de CI confronta as duas.
-- ===========================================================================

-- O1 — resolução do perfil pela classe da fonte (prefixo mais longo que casa).
CREATE OR REPLACE FUNCTION public.escalation_profile_for(p_routine TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_routine IS NULL OR p_routine = '' THEN 'operational'
    WHEN p_routine LIKE 'admission_trend:%'      THEN 'slow_accounting'
    WHEN p_routine LIKE 'admission_reconcile:%'  THEN 'slow_accounting'
    WHEN p_routine LIKE 'admission_backlog:%'    THEN 'slow_accounting'
    ELSE 'operational'
  END
$$;

COMMENT ON FUNCTION public.escalation_profile_for(TEXT) IS
  'Onda 238 (O1): perfil de escalada pela classe da fonte. Chave desconhecida cai no perfil historico da Onda 117.';

-- Escada declarada por perfil/severidade/nivel-destino. NULL = inalcancavel.
CREATE OR REPLACE FUNCTION public.escalation_ladder_minutes(
  p_profile  TEXT,
  p_severity TEXT,
  p_level    INT
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_level NOT BETWEEN 1 AND 3 THEN NULL
    WHEN p_profile = 'slow_accounting' AND p_severity = 'critical'
      THEN (ARRAY[NULL, 1440, 4320, 10080]::NUMERIC[])[p_level + 1]
    WHEN p_profile = 'slow_accounting' AND p_severity = 'warning'
      THEN (ARRAY[NULL, 20160, NULL, NULL]::NUMERIC[])[p_level + 1]
    WHEN p_severity = 'critical'
      THEN (ARRAY[NULL, 30, 120, 360]::NUMERIC[])[p_level + 1]
    ELSE (ARRAY[NULL, 240, 1440, NULL]::NUMERIC[])[p_level + 1]
  END
$$;

COMMENT ON FUNCTION public.escalation_ladder_minutes(TEXT, TEXT, INT) IS
  'Onda 238: idade minima (min) por nivel de destino. Espelho de ladderMinutes em src/lib/escalationProfiles.ts.';

-- Intervalo minimo entre degraus e carencia de nao-entrega, por perfil (O2).
CREATE OR REPLACE FUNCTION public.escalation_profile_timing(p_profile TEXT)
RETURNS TABLE (min_step_minutes NUMERIC, undelivered_grace_minutes NUMERIC, anchor_mode TEXT, cadence_minutes NUMERIC)
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT t.min_step_minutes, t.undelivered_grace_minutes, t.anchor_mode, t.cadence_minutes
  FROM (VALUES
    ('slow_accounting', 1440::NUMERIC, 1440::NUMERIC, 'streak', 1440::NUMERIC),
    ('operational',       30::NUMERIC,   75::NUMERIC, 'row',    NULL::NUMERIC)
  ) AS t(profile, min_step_minutes, undelivered_grace_minutes, anchor_mode, cadence_minutes)
  WHERE t.profile = COALESCE(NULLIF(p_profile, ''), 'operational')
$$;

COMMENT ON FUNCTION public.escalation_profile_timing(TEXT) IS
  'Onda 238 (O2): intervalo minimo entre degraus, carencia de nao-entrega e modo de ancora por perfil.';

-- ---------------------------------------------------------------------------
-- Cron de escalada, agora com perfil e ancora da condicao (O3/O4/O5).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.escalate_stale_maintenance_alerts()
RETURNS TABLE (escalated_alert_id UUID, previous_level SMALLINT, new_level SMALLINT, age_min NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  r               RECORD;
  v_age           NUMERIC;
  v_target        SMALLINT;
  v_next          SMALLINT;
  v_ceiling       SMALLINT;
  v_required      NUMERIC;
  v_delivered     BOOLEAN;
  v_since_step    NUMERIC;
  v_profile       TEXT;
  v_min_step      NUMERIC;
  v_grace         NUMERIC;
  v_anchor_mode   TEXT;
  v_anchor_at     TIMESTAMPTZ;
  v_streak_level  SMALLINT;
  v_streak_rows   INT;
  v_from          SMALLINT;
  v_anchored      BOOLEAN;
BEGIN
  IF NOT pg_try_advisory_lock(hashtext('escalate_stale_maintenance_alerts')) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT e.id,
           e.routine,
           e.severity,
           e.created_at,
           e.escalation_level,
           e.last_escalated_at,
           EXISTS (
             SELECT 1 FROM public.maintenance_alert_dispatches d
              WHERE d.alert_id = e.id AND d.status = 'sent'
           ) AS delivered
      FROM public.maintenance_alert_events e
     WHERE e.acknowledged_at IS NULL
       AND e.routine <> 'maintenance_escalation'
       AND e.created_at > now() - INTERVAL '90 days'
       AND e.escalation_level < CASE WHEN e.severity = 'critical' THEN 3 ELSE 2 END
     ORDER BY e.created_at
     FOR UPDATE OF e SKIP LOCKED
  LOOP
    v_profile := public.escalation_profile_for(r.routine);
    SELECT t.min_step_minutes, t.undelivered_grace_minutes, t.anchor_mode
      INTO v_min_step, v_grace, v_anchor_mode
      FROM public.escalation_profile_timing(v_profile) t;

    v_delivered := r.delivered;
    v_ceiling := CASE WHEN r.severity = 'critical' THEN 3 ELSE 2 END;
    v_anchored := FALSE;
    v_from := r.escalation_level;
    v_age := GREATEST(0, EXTRACT(EPOCH FROM (now() - r.created_at)) / 60.0);

    -- O3/O4/O5 — ancora da condicao: linha aberta mais antiga da mesma chave
    -- criada DEPOIS do reconhecimento mais recente daquela chave; o nivel de
    -- partida e o maior ja alcancado dentro dessa sequencia.
    IF v_anchor_mode = 'streak' THEN
      WITH cut AS (
        SELECT COALESCE(MAX(e.created_at), '-infinity'::TIMESTAMPTZ) AS ack_created_at
          FROM public.maintenance_alert_events e
         WHERE e.routine = r.routine
           AND e.acknowledged_at IS NOT NULL
      )
      SELECT MIN(e.created_at), COALESCE(MAX(e.escalation_level), 0), COUNT(*)
        INTO v_anchor_at, v_streak_level, v_streak_rows
        FROM public.maintenance_alert_events e, cut
       WHERE e.routine = r.routine
         AND e.acknowledged_at IS NULL
         AND e.created_at > cut.ack_created_at;

      IF v_anchor_at IS NOT NULL THEN
        v_anchored := TRUE;
        v_age := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_anchor_at)) / 60.0);
        v_from := GREATEST(r.escalation_level, v_streak_level);
      END IF;
    END IF;

    -- Nivel que a idade justifica, com aceleracao apenas do primeiro degrau
    -- quando nenhum canal entregou (heranca da Onda 117).
    v_target := 0;
    FOR i IN 1..v_ceiling LOOP
      v_required := public.escalation_ladder_minutes(v_profile, r.severity, i);
      IF v_required IS NULL THEN EXIT; END IF;
      IF NOT v_delivered AND i = 1 THEN
        v_required := LEAST(v_required, v_grace);
      END IF;
      IF v_age >= v_required THEN v_target := i::SMALLINT; ELSE EXIT; END IF;
    END LOOP;

    IF v_target <= v_from THEN CONTINUE; END IF;

    v_since_step := CASE
      WHEN r.last_escalated_at IS NULL THEN NULL
      ELSE EXTRACT(EPOCH FROM (now() - r.last_escalated_at)) / 60.0
    END;
    IF v_since_step IS NOT NULL AND v_since_step < v_min_step THEN CONTINUE; END IF;

    v_next := LEAST(v_from + 1, v_target, v_ceiling)::SMALLINT;
    IF v_next <= r.escalation_level THEN CONTINUE; END IF;

    UPDATE public.maintenance_alert_events
       SET escalation_level = v_next,
           last_escalated_at = now()
     WHERE id = r.id;

    INSERT INTO public.maintenance_alert_escalations AS mae
      (alert_id, from_level, to_level, age_minutes, reason, emitted_alert, detail)
    VALUES (
      r.id, r.escalation_level, v_next, ROUND(v_age, 1),
      format('%s min sem reconhecimento; %s [perfil: %s%s]',
             ROUND(v_age, 1),
             CASE WHEN v_delivered THEN 'notificacao entregue' ELSE 'sem entrega confirmada' END,
             v_profile,
             CASE WHEN v_anchored THEN format('; ancora da condicao sobre %s linha(s)', v_streak_rows) ELSE '' END),
      v_next >= 2,
      jsonb_build_object(
        'routine', r.routine,
        'severity', r.severity,
        'delivered', v_delivered,
        'profile', v_profile,
        'anchored_on_streak', v_anchored,
        'streak_rows', CASE WHEN v_anchored THEN v_streak_rows ELSE NULL END
      )
    )
    ON CONFLICT ON CONSTRAINT maintenance_alert_escalations_step_key DO NOTHING;

    IF v_next >= 2 THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES (
        'maintenance_escalation',
        'critical',
        format('Alerta de %s sem reconhecimento ha %s min — nivel %s [perfil: %s]',
               r.routine, ROUND(v_age, 1), v_next, v_profile),
        jsonb_build_object(
          'source_alert_id', r.id,
          'source_routine', r.routine,
          'source_severity', r.severity,
          'level', v_next,
          'age_minutes', ROUND(v_age, 1),
          'profile', v_profile,
          'anchored_on_streak', v_anchored
        ),
        now()
      );
    END IF;

    escalated_alert_id := r.id;
    previous_level := r.escalation_level;
    new_level := v_next;
    age_min := ROUND(v_age, 1);
    RETURN NEXT;
  END LOOP;

  PERFORM pg_advisory_unlock(hashtext('escalate_stale_maintenance_alerts'));
END;
$function$;

COMMENT ON FUNCTION public.escalate_stale_maintenance_alerts() IS
  'Onda 117 + 238: sobe a escada de urgencia dos alertas nao reconhecidos, com perfil por classe de fonte e ancora na condicao para fontes renovaveis.';

REVOKE ALL ON FUNCTION public.escalation_profile_for(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalation_ladder_minutes(TEXT, TEXT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalation_profile_timing(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalation_profile_for(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalation_ladder_minutes(TEXT, TEXT, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalation_profile_timing(TEXT) TO authenticated, service_role;