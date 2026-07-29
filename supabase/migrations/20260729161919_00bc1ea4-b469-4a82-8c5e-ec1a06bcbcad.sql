-- ===========================================================================
-- Onda 249 — A escada tambem esquece o reconhecimento (Leis Y1-Y10)
-- Espelho SQL de src/lib/maintenance/escalationAckGate.ts
-- ===========================================================================

-- Y9 — a condicao ainda persiste? Medida pelo MUNDO, nunca pelo operador.
--   TRUE  : a fonte reemitiu a mesma rotina depois do reconhecimento.
--   FALSE : a fonte teve ao menos uma cadencia e meia de chance e ficou quieta.
--   NULL  : ainda dentro da cadencia — nao medido (a Y9 tratara como persistente).
CREATE OR REPLACE FUNCTION public.escalation_condition_persists(
  p_routine  TEXT,
  p_ack_at   TIMESTAMPTZ,
  p_cadence  NUMERIC DEFAULT 60,
  p_now      TIMESTAMPTZ DEFAULT now()
) RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_reemitted BOOLEAN;
  v_cadence   NUMERIC := GREATEST(COALESCE(p_cadence, 60), 1);
BEGIN
  IF p_ack_at IS NULL THEN
    RETURN TRUE;  -- sem ack, a pergunta nao se aplica; nunca honrar por omissao
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.maintenance_alert_events e
     WHERE e.routine = p_routine
       AND e.created_at > p_ack_at
  ) INTO v_reemitted;

  IF v_reemitted THEN
    RETURN TRUE;
  END IF;

  -- Silencio da fonte so vale como resolucao depois de ela ter tido chance de
  -- medir de novo. Antes disso, a ausencia de noticia nao e noticia.
  IF p_now >= p_ack_at + make_interval(mins => CEIL(v_cadence * 1.5)::INT) THEN
    RETURN FALSE;
  END IF;

  RETURN NULL;
END;
$$;

-- Y1-Y10 — portao: este reconhecimento, agora, ainda congela a escada?
CREATE OR REPLACE FUNCTION public.escalation_ack_gate(
  p_alert_id TIMESTAMPTZ,          -- placeholder para manter assinatura estavel
  p_dummy    BOOLEAN DEFAULT NULL
) RETURNS VOID LANGUAGE sql IMMUTABLE AS $$ SELECT NULL::void $$;

DROP FUNCTION IF EXISTS public.escalation_ack_gate(TIMESTAMPTZ, BOOLEAN);

CREATE OR REPLACE FUNCTION public.escalation_ack_gate(
  p_acknowledged_at   TIMESTAMPTZ,
  p_acknowledged_by   TEXT,
  p_severity_at_ack   TEXT,
  p_severity_now      TEXT,
  p_condition_persists BOOLEAN,
  p_self_referential  BOOLEAN DEFAULT FALSE,
  p_cadence_minutes   INT     DEFAULT 60,
  p_now               TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_state JSONB;
  v_name  TEXT;
  v_live  BOOLEAN;
  v_broken BOOLEAN;
BEGIN
  v_state := public.acknowledgement_state(
    p_acknowledged_at,
    p_acknowledged_by,
    p_severity_at_ack,
    p_severity_now,
    p_condition_persists,
    COALESCE(p_self_referential, FALSE),
    COALESCE(p_cadence_minutes, 60),
    p_now
  );
  v_name := v_state->>'state';
  v_live   := v_name IN ('pending', 'honored');
  v_broken := v_name IN ('expired', 'void_aggravated', 'void_unattributed');

  RETURN jsonb_build_object(
    'state', v_name,
    'freezes_ladder', v_live,   -- Y1/Y3/Y4/Y5
    'cuts_streak',    v_live,   -- Y8
    'decayed',        v_broken,
    'minutes_remaining', v_state->'minutes_remaining',
    'window_minutes',    v_state->'window_minutes',
    'reason', CASE WHEN v_broken
                   THEN (v_state->>'reason') || '; escada retomada do degrau atual'
                   ELSE (v_state->>'reason') END
  );
END;
$$;

-- Aplica o portao a uma linha concreta de alerta.
-- A severidade "agora" e a PIOR severidade aberta da mesma rotina emitida
-- depois do reconhecimento: reconhecer um aviso nunca cobre o critico que veio
-- em seguida (Y4).
CREATE OR REPLACE FUNCTION public.escalation_ack_frozen(
  p_alert_id UUID,
  p_now      TIMESTAMPTZ DEFAULT now()
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r           RECORD;
  v_profile   TEXT;
  v_cadence   NUMERIC;
  v_persists  BOOLEAN;
  v_sev_now   TEXT;
  v_self_ref  BOOLEAN;
BEGIN
  SELECT e.routine, e.severity, e.acknowledged_at, e.acknowledged_by
    INTO r
    FROM public.maintenance_alert_events e
   WHERE e.id = p_alert_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state','none','freezes_ladder',false,
      'cuts_streak',false,'decayed',false,'reason','alerta inexistente');
  END IF;

  IF r.acknowledged_at IS NULL THEN
    RETURN jsonb_build_object('state','none','freezes_ladder',false,
      'cuts_streak',false,'decayed',false,'reason','sem reconhecimento registrado');
  END IF;

  v_profile := public.escalation_profile_for(r.routine);
  SELECT t.cadence_minutes INTO v_cadence
    FROM public.escalation_profile_timing(v_profile) t;

  v_persists := public.escalation_condition_persists(
    r.routine, r.acknowledged_at, COALESCE(v_cadence, 60), p_now);

  -- Y4 — agravamento medido no mundo: houve critico da mesma rotina depois do ack?
  SELECT CASE WHEN bool_or(e.severity = 'critical') THEN 'critical' ELSE r.severity END
    INTO v_sev_now
    FROM public.maintenance_alert_events e
   WHERE e.routine = r.routine
     AND e.created_at > r.acknowledged_at;
  v_sev_now := COALESCE(v_sev_now, r.severity);

  v_self_ref := (r.routine = 'dispatch_deliverability');

  RETURN public.escalation_ack_gate(
    r.acknowledged_at,
    r.acknowledged_by::TEXT,
    r.severity,
    v_sev_now,
    v_persists,
    v_self_ref,
    GREATEST(COALESCE(v_cadence, 60), 1)::INT,
    p_now
  );
END;
$$;

REVOKE ALL ON FUNCTION public.escalation_condition_persists(TEXT, TIMESTAMPTZ, NUMERIC, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalation_ack_gate(TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, TIMESTAMPTZ) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.escalation_ack_frozen(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.escalation_ack_gate(TIMESTAMPTZ, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INT, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalation_ack_frozen(UUID, TIMESTAMPTZ) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.escalation_condition_persists(TEXT, TIMESTAMPTZ, NUMERIC, TIMESTAMPTZ) TO authenticated, service_role;

-- ===========================================================================
-- Escada: reconhecimento decaido devolve o alerta a fila (Y1/Y2/Y6/Y7/Y8)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.escalate_stale_maintenance_alerts()
 RETURNS TABLE(escalated_alert_id uuid, previous_level smallint, new_level smallint, age_min numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  v_gate          JSONB;
  v_ack_state     TEXT;
BEGIN
  IF NOT pg_try_advisory_lock(hashtext('escalate_stale_maintenance_alerts')) THEN
    RETURN;
  END IF;

  FOR r IN
    SELECT e.id,
           e.routine,
           e.severity,
           e.created_at,
           e.acknowledged_at,
           e.escalation_level,
           e.last_escalated_at,
           EXISTS (
             SELECT 1 FROM public.maintenance_alert_dispatches d
              WHERE d.alert_id = e.id AND d.status = 'sent'
           ) AS delivered
      FROM public.maintenance_alert_events e
     WHERE e.routine <> 'maintenance_escalation'
       AND e.created_at > now() - INTERVAL '90 days'
       AND e.escalation_level < CASE WHEN e.severity = 'critical' THEN 3 ELSE 2 END
     ORDER BY e.created_at
     FOR UPDATE OF e SKIP LOCKED
  LOOP
    -- Onda 249 (Y1) — reconhecer congela por PRAZO, nao para sempre.
    v_ack_state := 'none';
    IF r.acknowledged_at IS NOT NULL THEN
      v_gate := public.escalation_ack_frozen(r.id, now());
      v_ack_state := COALESCE(v_gate->>'state', 'none');
      IF COALESCE((v_gate->>'freezes_ladder')::BOOLEAN, TRUE) THEN
        CONTINUE;   -- promessa viva (ou condicao resolvida): escada parada
      END IF;
    END IF;

    v_profile := public.escalation_profile_for(r.routine);
    SELECT t.min_step_minutes, t.undelivered_grace_minutes, t.anchor_mode
      INTO v_min_step, v_grace, v_anchor_mode
      FROM public.escalation_profile_timing(v_profile) t;

    v_delivered := r.delivered;
    v_ceiling := CASE WHEN r.severity = 'critical' THEN 3 ELSE 2 END;
    v_anchored := FALSE;
    v_from := r.escalation_level;
    v_age := GREATEST(0, EXTRACT(EPOCH FROM (now() - r.created_at)) / 60.0);

    -- O3/O4/O5 + Y8 — a ancora corta a serie apenas em reconhecimentos que
    -- AINDA congelam. Um ack decaido que cortasse a serie apagaria a memoria
    -- do degrau ja atingido: seria a Y2 burlada pela porta dos fundos.
    IF v_anchor_mode = 'streak' THEN
      WITH cut AS (
        SELECT COALESCE(MAX(e.created_at), '-infinity'::TIMESTAMPTZ) AS ack_created_at
          FROM public.maintenance_alert_events e
         WHERE e.routine = r.routine
           AND e.acknowledged_at IS NOT NULL
           AND COALESCE((public.escalation_ack_frozen(e.id, now())->>'freezes_ladder')::BOOLEAN, FALSE)
      )
      SELECT MIN(e.created_at), COALESCE(MAX(e.escalation_level), 0), COUNT(*)
        INTO v_anchor_at, v_streak_level, v_streak_rows
        FROM public.maintenance_alert_events e, cut
       WHERE e.routine = r.routine
         AND e.created_at > cut.ack_created_at
         AND NOT COALESCE(
               (public.escalation_ack_frozen(e.id, now())->>'freezes_ladder')::BOOLEAN, FALSE);

      IF v_anchor_at IS NOT NULL THEN
        v_anchored := TRUE;
        -- Y7 — a idade nao e reancorada pelo ack; segue a serie da condicao.
        v_age := GREATEST(0, EXTRACT(EPOCH FROM (now() - v_anchor_at)) / 60.0);
        -- Y2 — nunca rebaixa: parte do maior degrau ja alcancado na serie.
        v_from := GREATEST(r.escalation_level, v_streak_level);
      END IF;
    END IF;

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

    -- Y6 — ack decaido NAO zera o cooldown entre degraus.
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
      format('%s min sem tratamento; %s [perfil: %s%s%s]',
             ROUND(v_age, 1),
             CASE WHEN v_delivered THEN 'notificacao entregue' ELSE 'sem entrega confirmada' END,
             v_profile,
             CASE WHEN v_anchored THEN format('; ancora da condicao sobre %s linha(s)', v_streak_rows) ELSE '' END,
             CASE WHEN v_ack_state <> 'none' THEN format('; ack %s', v_ack_state) ELSE '' END),
      v_next >= 2,
      jsonb_build_object(
        'routine', r.routine,
        'severity', r.severity,
        'delivered', v_delivered,
        'profile', v_profile,
        'anchored_on_streak', v_anchored,
        'streak_rows', CASE WHEN v_anchored THEN v_streak_rows ELSE NULL END,
        'ack_state', v_ack_state
      )
    )
    ON CONFLICT ON CONSTRAINT maintenance_alert_escalations_step_key DO NOTHING;

    IF v_next >= 2 THEN
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
      VALUES (
        'maintenance_escalation',
        'critical',
        format('Alerta de %s sem tratamento ha %s min — nivel %s [perfil: %s%s]',
               r.routine, ROUND(v_age, 1), v_next, v_profile,
               CASE WHEN v_ack_state <> 'none' THEN format('; ack %s', v_ack_state) ELSE '' END),
        jsonb_build_object(
          'source_alert_id', r.id,
          'source_routine', r.routine,
          'source_severity', r.severity,
          'level', v_next,
          'age_minutes', ROUND(v_age, 1),
          'profile', v_profile,
          'anchored_on_streak', v_anchored,
          'ack_state', v_ack_state
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

-- ===========================================================================
-- Autoteste dinamico (memoria do projeto: gate estatico nao prova execucao)
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.escalation_decay_selftest()
RETURNS TABLE(guard TEXT, ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_now  TIMESTAMPTZ := now();
  g      JSONB;
BEGIN
  -- Y1: dentro da janela congela; fora dela decai.
  g := public.escalation_ack_gate(v_now - INTERVAL '10 min', 'op', 'critical', 'critical', TRUE, FALSE, 60, v_now);
  guard := 'Y1 promessa viva congela';
  ok := (g->>'state') = 'pending' AND (g->>'freezes_ladder')::BOOLEAN;
  detail := g::TEXT; RETURN NEXT;

  g := public.escalation_ack_gate(v_now - INTERVAL '500 min', 'op', 'critical', 'critical', TRUE, FALSE, 60, v_now);
  guard := 'Y1 promessa vencida decai';
  ok := (g->>'state') = 'expired' AND NOT (g->>'freezes_ladder')::BOOLEAN AND (g->>'decayed')::BOOLEAN;
  detail := g::TEXT; RETURN NEXT;

  -- Y3: condicao resolvida honra para sempre.
  g := public.escalation_ack_gate(v_now - INTERVAL '400 days', 'op', 'critical', 'critical', FALSE, FALSE, 60, v_now);
  guard := 'Y3 condicao resolvida honra sempre';
  ok := (g->>'state') = 'honored' AND (g->>'freezes_ladder')::BOOLEAN;
  detail := g::TEXT; RETURN NEXT;

  -- Y4: agravamento fura na hora.
  g := public.escalation_ack_gate(v_now - INTERVAL '1 min', 'op', 'warning', 'critical', TRUE, FALSE, 60, v_now);
  guard := 'Y4 agravamento fura o congelamento';
  ok := (g->>'state') = 'void_aggravated' AND NOT (g->>'freezes_ladder')::BOOLEAN;
  detail := g::TEXT; RETURN NEXT;

  -- Y5: ack sem autor nunca congela.
  g := public.escalation_ack_gate(v_now - INTERVAL '1 min', NULL, 'critical', 'critical', TRUE, FALSE, 60, v_now);
  guard := 'Y5 ack sem autor nao congela';
  ok := (g->>'state') = 'void_unattributed' AND NOT (g->>'freezes_ladder')::BOOLEAN;
  detail := g::TEXT; RETURN NEXT;

  -- Y8: apenas promessa viva corta a serie.
  guard := 'Y8 so promessa viva corta a serie';
  ok := (public.escalation_ack_gate(v_now - INTERVAL '10 min','op','critical','critical',TRUE,FALSE,60,v_now)->>'cuts_streak')::BOOLEAN
    AND NOT (public.escalation_ack_gate(v_now - INTERVAL '500 min','op','critical','critical',TRUE,FALSE,60,v_now)->>'cuts_streak')::BOOLEAN;
  detail := 'viva corta / decaida preserva'; RETURN NEXT;

  -- Y9: condicao nao medida nunca honra.
  g := public.escalation_ack_gate(v_now - INTERVAL '500 min', 'op', 'critical', 'critical', NULL, FALSE, 60, v_now);
  guard := 'Y9 ignorancia nunca honra';
  ok := (g->>'state') = 'expired';
  detail := g::TEXT; RETURN NEXT;

  -- Medicao da condicao: reemissao recente prova persistencia.
  guard := 'condicao reemitida persiste';
  ok := COALESCE(public.escalation_condition_persists(
          'dispatch_deliverability',
          (SELECT MIN(created_at) - INTERVAL '1 min' FROM public.maintenance_alert_events
            WHERE routine = 'dispatch_deliverability'),
          60, v_now), FALSE) IS TRUE
        OR NOT EXISTS (SELECT 1 FROM public.maintenance_alert_events WHERE routine = 'dispatch_deliverability');
  detail := 'reemissao apos o ack conta como condicao viva'; RETURN NEXT;

  -- Y2/Y10 (prova adversarial em dados reais, desfeita na subtransacao):
  -- reconhecer TODOS os alertas abertos nao pode congelar a escada de forma
  -- permanente para condicoes vivas.
  DECLARE
    v_touched INT := 0;
    v_frozen_forever INT := 0;
  BEGIN
    UPDATE public.maintenance_alert_events
       SET acknowledged_at = v_now - INTERVAL '400 min',
           acknowledged_by = COALESCE(acknowledged_by, '00000000-0000-0000-0000-000000000001'::UUID)
     WHERE acknowledged_at IS NULL
       AND severity = 'critical'
       AND routine <> 'maintenance_escalation';
    GET DIAGNOSTICS v_touched = ROW_COUNT;

    SELECT COUNT(*) INTO v_frozen_forever
      FROM public.maintenance_alert_events e
     WHERE e.acknowledged_at = v_now - INTERVAL '400 min'
       AND COALESCE((public.escalation_ack_frozen(e.id, v_now)->>'freezes_ladder')::BOOLEAN, TRUE);

    guard := 'ADVERSARIAL: ack em massa nao congela condicao viva';
    ok := (v_touched = 0) OR (v_frozen_forever = 0);
    detail := format('%s alertas reconhecidos; %s permaneceriam congelados', v_touched, v_frozen_forever);
    RETURN NEXT;

    RAISE EXCEPTION 'rollback-selftest';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'rollback-selftest' THEN
      guard := 'ADVERSARIAL: erro inesperado';
      ok := FALSE; detail := SQLERRM; RETURN NEXT;
    END IF;
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.escalation_decay_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalation_decay_selftest() TO service_role;