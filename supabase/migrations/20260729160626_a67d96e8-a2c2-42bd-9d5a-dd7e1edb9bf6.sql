-- ===========================================================================
-- Onda 248 — Reconhecer não é consertar.
--
-- Espelho SQL de src/lib/maintenance/acknowledgementDecay.ts (Leis X1–X10).
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- X2 — a acusação conta DANO, não desatenção.
--
-- Um crítico "sem aviso" é aquele que nunca teve um despacho entregue. O
-- reconhecimento é um gesto interno no console: ele não avisa o plantonista
-- que está longe da tela e, portanto, não pode apagar a prova de que ninguém
-- foi avisado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.undelivered_critical_count(
  p_since interval DEFAULT '90 days'::interval
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)
  FROM public.maintenance_alert_events e
  WHERE e.severity = 'critical'
    AND e.created_at > now() - p_since
    AND NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_dispatches d
      WHERE d.alert_id = e.id AND d.status = 'sent'
    );
$function$;

COMMENT ON FUNCTION public.undelivered_critical_count(interval) IS
  'Onda 248 / X2: críticos que nunca foram entregues. Imune a reconhecimento.';

-- Lavagem de acusação: reconhecidos sem jamais terem sido entregues.
-- Publicado para ser exibido, nunca escondido.
CREATE OR REPLACE FUNCTION public.laundered_critical_count(
  p_since interval DEFAULT '90 days'::interval
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT count(*)
  FROM public.maintenance_alert_events e
  WHERE e.severity = 'critical'
    AND e.created_at > now() - p_since
    AND e.acknowledged_at IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.maintenance_alert_dispatches d
      WHERE d.alert_id = e.id AND d.status = 'sent'
    );
$function$;

-- ---------------------------------------------------------------------------
-- X8 — janela de promessa: urgência encurta a paciência.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.promise_window_minutes(
  p_severity text,
  p_cadence_minutes int DEFAULT 60
)
RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  floor_min   constant int := 30;
  ceiling_min constant int := 1440;
  v_base int;
  v_floor int;
BEGIN
  IF p_cadence_minutes IS NULL OR p_cadence_minutes <= 0 THEN
    RAISE EXCEPTION 'cadência inválida para janela de promessa: %', p_cadence_minutes;
  END IF;

  v_base := CASE p_severity WHEN 'critical' THEN 120 ELSE 720 END;
  -- Nunca reacusar antes de a fonte ter tido nova chance de medir.
  v_floor := GREATEST(floor_min, p_cadence_minutes);

  RETURN LEAST(ceiling_min, GREATEST(v_floor, v_base));
END;
$function$;

-- ---------------------------------------------------------------------------
-- X1, X3–X5, X7, X9, X10 — o veredito do reconhecimento.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledgement_state(
  p_acknowledged_at   timestamptz,
  p_acknowledged_by   text,
  p_severity_at_ack   text,
  p_severity_now      text,
  p_condition_persists boolean,
  p_self_referential  boolean DEFAULT false,
  p_cadence_minutes   int DEFAULT 60,
  p_now               timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  v_window  int := public.promise_window_minutes(COALESCE(p_severity_now, 'warning'), p_cadence_minutes);
  v_author  text := btrim(COALESCE(p_acknowledged_by, ''));
  v_elapsed numeric;
  v_left    numeric;
BEGIN
  IF p_acknowledged_at IS NULL THEN
    RETURN jsonb_build_object('state','none','suppresses_escalation',false,
      'clears_condition',false,'minutes_remaining',NULL,'window_minutes',v_window,
      'reason','sem reconhecimento registrado');
  END IF;

  -- X9 — silêncio comprado por ninguém não é consentimento.
  IF v_author = '' THEN
    RETURN jsonb_build_object('state','void_unattributed','suppresses_escalation',false,
      'clears_condition',false,'minutes_remaining',NULL,'window_minutes',v_window,
      'reason','reconhecimento sem autor legível — não é consentimento válido');
  END IF;

  -- X5 — o operador consentiu com um fato menor do que o atual.
  IF p_severity_at_ack = 'warning' AND p_severity_now = 'critical' THEN
    RETURN jsonb_build_object('state','void_aggravated','suppresses_escalation',false,
      'clears_condition',false,'minutes_remaining',NULL,'window_minutes',v_window,
      'reason','condição agravou de aviso para crítico após o reconhecimento');
  END IF;

  -- X4 — quem encerra a validade é a condição, não o relógio.
  -- NULL (não medido) nunca honra: ignorância não é resolução.
  IF p_condition_persists IS NOT NULL AND p_condition_persists = false THEN
    RETURN jsonb_build_object('state','honored','suppresses_escalation',true,
      -- X7 — auto-referente jamais pinta saúde: a prova de que o canal voltou
      -- tem de vir do canal, não do console.
      'clears_condition', NOT COALESCE(p_self_referential,false),
      'minutes_remaining',NULL,'window_minutes',v_window,
      'reason','condição não persiste — reconhecimento cumprido');
  END IF;

  v_elapsed := EXTRACT(EPOCH FROM (p_now - p_acknowledged_at)) / 60.0;
  v_left    := v_window - v_elapsed;

  -- X3 — vencida a promessa com a condição viva, a acusação volta.
  IF v_left <= 0 THEN
    RETURN jsonb_build_object('state','expired','suppresses_escalation',false,
      'clears_condition',false,'minutes_remaining',0,'window_minutes',v_window,
      'reason', format('janela de promessa de %s min vencida com a condição ainda ativa', v_window));
  END IF;

  RETURN jsonb_build_object('state','pending','suppresses_escalation',true,
    'clears_condition',false,  -- X1 — atenção nunca é remediação.
    'minutes_remaining', round(LEAST(v_left, v_window))::int,
    'window_minutes',v_window,
    'reason', format('reconhecido por %s; condição ainda ativa', v_author));
END;
$function$;

-- ---------------------------------------------------------------------------
-- Correção da avaliação de entregabilidade (Onda 246/247) para obedecer X2.
--
-- Antes: v_open_crit contava `acknowledged_at IS NULL` — reconhecer derrubava
-- a acusação de mudez de crítico para aviso sem nenhuma entrega. Agora a
-- acusação conta entregas ausentes; a desatenção vira um eixo separado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assess_dispatch_deliverability(
  p_now timestamptz DEFAULT now(),
  p_cadence_minutes integer DEFAULT 60
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  grace_minutes constant int := 15;
  v_now        timestamptz := COALESCE(p_now, now());
  v_run        public.maintenance_dispatch_runs%ROWTYPE;
  v_minutes    numeric;
  v_punct      text;
  v_delivery   text;
  v_channels   text[];
  v_undelivered bigint;
  v_unacked    bigint;
  v_laundered  bigint;
  v_unnotified bigint;
  v_reasons    text[] := ARRAY[]::text[];
BEGIN
  -- X2 — DANO: críticos que nunca foram entregues. Imune a reconhecimento.
  v_undelivered := public.undelivered_critical_count();
  -- Eixo separado: desatenção. Nunca substitui o dano.
  SELECT count(*) INTO v_unacked
  FROM public.maintenance_alert_events e
  WHERE e.severity = 'critical' AND e.acknowledged_at IS NULL
    AND e.created_at > now() - interval '90 days';
  v_laundered := public.laundered_critical_count();

  -- V7 — execução no futuro não compra frescor.
  SELECT * INTO v_run
  FROM public.maintenance_dispatch_runs r
  WHERE r.ran_at <= v_now
  ORDER BY r.ran_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- V1 — ausência de registro nunca é saúde.
    RETURN jsonb_build_object(
      'punctuality','unknown','delivery','unknown','health','unknown',
      'minutes_since_run',NULL,'last_run_at',NULL,'channels','[]'::jsonb,
      'unnotified_critical', COALESCE(v_undelivered,0),
      'undelivered_critical', COALESCE(v_undelivered,0),
      'unacked_critical', COALESCE(v_unacked,0),
      'laundered_critical', COALESCE(v_laundered,0),
      'reasons', to_jsonb(ARRAY['nenhuma execução registrada do despachante'])
    );
  END IF;

  v_minutes := EXTRACT(EPOCH FROM (v_now - v_run.ran_at)) / 60.0;

  v_punct := CASE
    WHEN v_minutes <= p_cadence_minutes + grace_minutes THEN 'fresh'
    WHEN v_minutes <= p_cadence_minutes * 2 + grace_minutes THEN 'late'
    ELSE 'stalled'
  END;
  IF v_punct = 'late' THEN
    v_reasons := v_reasons || 'despachante atrasado em relação à cadência';
  ELSIF v_punct = 'stalled' THEN
    v_reasons := v_reasons || 'despachante parado além do dobro da cadência';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT c ORDER BY c), ARRAY[]::text[])
    INTO v_channels
  FROM unnest(COALESCE(v_run.channels, ARRAY[]::text[])) AS c
  WHERE btrim(c) <> '';

  IF v_run.planned IS NULL OR v_run.sent IS NULL OR v_run.failed IS NULL THEN
    v_delivery := 'unreadable';  -- V8
    v_reasons := v_reasons || 'contagens da última execução ilegíveis';
  ELSIF v_run.candidates IS NOT NULL AND v_run.skipped IS NOT NULL
        AND v_run.candidates <> v_run.planned + v_run.skipped THEN
    v_delivery := 'unreadable';  -- V8
    v_reasons := v_reasons || format(
      'contabilidade não fecha: %s candidato(s) <> %s planejado(s) + %s descartado(s)',
      v_run.candidates, v_run.planned, v_run.skipped);
  ELSIF cardinality(v_channels) = 0 THEN
    v_delivery := 'muted';       -- V2
    v_reasons := v_reasons || CASE WHEN COALESCE(v_undelivered,0) > 0
      THEN format('nenhum canal configurado com %s crítico(s) jamais entregue(s) — ninguém foi avisado', v_undelivered)
      ELSE 'nenhum canal externo configurado — o despachante está mudo' END;
  ELSIF v_run.planned = 0 THEN
    v_delivery := 'idle';        -- V4
  ELSIF v_run.sent > 0 AND v_run.failed = 0 THEN
    v_delivery := 'delivering';
  ELSIF v_run.sent > 0 THEN
    v_delivery := 'degraded';    -- V3
    v_reasons := v_reasons || format('%s envio(s) falharam na última execução', v_run.failed);
  ELSE
    v_delivery := 'failing';     -- V3
    v_reasons := v_reasons || format('nenhum dos %s envio(s) planejados saiu', v_run.planned);
  END IF;

  -- Só mudez e falha total deixam crítico sem aviso; degradação não.
  v_unnotified := CASE WHEN v_delivery IN ('muted','failing')
                       THEN COALESCE(v_undelivered,0) ELSE 0 END;

  -- X2 — a lavagem é declarada, nunca escondida.
  IF COALESCE(v_laundered,0) > 0 THEN
    v_reasons := v_reasons || format(
      '%s crítico(s) foram reconhecidos sem nunca terem sido entregues', v_laundered);
  END IF;

  RETURN jsonb_build_object(
    'punctuality', v_punct,
    'delivery', v_delivery,
    'health', CASE
      -- V6 — o pior eixo governa; nenhuma média, nenhuma maioria.
      WHEN v_punct = 'stalled' OR v_delivery = 'failing'
           OR (v_delivery = 'muted' AND v_unnotified > 0) THEN 'critical'
      WHEN v_delivery = 'unreadable' THEN 'unknown'
      WHEN v_punct = 'late' OR v_delivery IN ('degraded','muted') THEN 'warning'
      ELSE 'ok'
    END,
    'minutes_since_run', round(v_minutes)::int,
    'last_run_at', v_run.ran_at,
    'channels', to_jsonb(v_channels),
    'unnotified_critical', v_unnotified,
    'undelivered_critical', COALESCE(v_undelivered,0),
    'unacked_critical', COALESCE(v_unacked,0),
    'laundered_critical', COALESCE(v_laundered,0),
    'open_critical', COALESCE(v_unacked,0),
    'reasons', to_jsonb(v_reasons)
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- Autoteste: exercício dinâmico das guardas (memória do projeto exige execução
-- real, não apenas gate estático).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledgement_decay_selftest()
RETURNS TABLE(guard text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t0 timestamptz := timestamptz '2026-07-29 16:00:00+00';
  j  jsonb;
BEGIN
  j := public.acknowledgement_state(NULL,'admin','critical','critical',true,false,60,t0);
  RETURN QUERY SELECT 'X10 sem ack é estado próprio', j->>'state' = 'none', j->>'state';

  j := public.acknowledgement_state(t0 - interval '10 min','   ','critical','critical',true,false,60,t0);
  RETURN QUERY SELECT 'X9 ack sem autor não vale', j->>'state' = 'void_unattributed', j->>'state';

  j := public.acknowledgement_state(t0 - interval '10 min','admin','warning','critical',true,false,60,t0);
  RETURN QUERY SELECT 'X5 agravamento invalida', j->>'state' = 'void_aggravated', j->>'state';

  j := public.acknowledgement_state(t0 - interval '999 h','admin','critical','critical',false,false,60,t0);
  RETURN QUERY SELECT 'X4 condição limpa honra mesmo vencido', j->>'state' = 'honored', j->>'state';

  j := public.acknowledgement_state(t0 - interval '999 h','admin','critical','critical',false,true,60,t0);
  RETURN QUERY SELECT 'X7 auto-referente não pinta saúde',
    (j->>'clears_condition')::boolean = false, j->>'clears_condition';

  j := public.acknowledgement_state(t0 - interval '10 min','admin','critical','critical',NULL,false,60,t0);
  RETURN QUERY SELECT 'fail-safe: não medido nunca honra', j->>'state' <> 'honored', j->>'state';

  j := public.acknowledgement_state(t0 - interval '10 min','admin','critical','critical',true,false,60,t0);
  RETURN QUERY SELECT 'X1 pendente não limpa condição',
    (j->>'clears_condition')::boolean = false, j->>'clears_condition';

  j := public.acknowledgement_state(t0 - interval '500 min','admin','critical','critical',true,false,60,t0);
  RETURN QUERY SELECT 'X3 janela vencida faz acusação voltar',
    j->>'state' = 'expired' AND (j->>'suppresses_escalation')::boolean = false, j->>'state';

  RETURN QUERY SELECT 'X8 urgência encurta paciência',
    public.promise_window_minutes('critical',60) < public.promise_window_minutes('warning',60),
    format('%s < %s', public.promise_window_minutes('critical',60), public.promise_window_minutes('warning',60));

  RETURN QUERY SELECT 'X8 nunca reacusa antes da próxima medição',
    public.promise_window_minutes('critical',600) >= 600,
    public.promise_window_minutes('critical',600)::text;

  BEGIN
    PERFORM public.promise_window_minutes('critical',0);
    RETURN QUERY SELECT 'X8 cadência inválida falha alto', false, 'não lançou';
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT 'X8 cadência inválida falha alto', true, 'lançou';
  END;

  RETURN QUERY SELECT 'X2 acusação é imune a reconhecimento',
    public.undelivered_critical_count() >= public.laundered_critical_count(),
    format('%s não entregues, %s lavados',
           public.undelivered_critical_count(), public.laundered_critical_count());
END;
$function$;

REVOKE ALL ON FUNCTION public.undelivered_critical_count(interval) FROM anon;
REVOKE ALL ON FUNCTION public.laundered_critical_count(interval) FROM anon;
REVOKE ALL ON FUNCTION public.acknowledgement_decay_selftest() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.undelivered_critical_count(interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.laundered_critical_count(interval) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.acknowledgement_decay_selftest() TO service_role;