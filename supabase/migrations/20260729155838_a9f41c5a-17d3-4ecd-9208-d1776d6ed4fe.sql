-- ============================================================================
-- Onda 247 — Fan-in da mudez do despachante para o barramento de manutenção.
--
-- Espelho SQL fiel de src/lib/maintenance/deliverabilityAlert.ts (Leis W1–W10)
-- e de assessDeliverability (Leis V1–V10, Onda 246). Qualquer divergência
-- entre este arquivo e o TypeScript é defeito: a régua pura é a fonte da
-- verdade e este é o executor autônomo.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- W1–W7 — severidade derivada do eixo de entrega. NULL = não emite.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deliverability_alert_severity(
  p_delivery text,
  p_unnotified_critical bigint DEFAULT 0
) RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT CASE p_delivery
    -- W2/W5 — crítico aberto agrava mudez e ignorância; nunca as atenua.
    WHEN 'muted'   THEN CASE WHEN COALESCE(p_unnotified_critical, 0) > 0
                             THEN 'critical' ELSE 'warning' END
    WHEN 'unknown' THEN CASE WHEN COALESCE(p_unnotified_critical, 0) > 0
                             THEN 'critical' ELSE 'warning' END
    WHEN 'failing'    THEN 'critical'  -- W3
    WHEN 'degraded'   THEN 'warning'   -- W4
    WHEN 'unreadable' THEN 'warning'   -- W6
    WHEN 'delivering' THEN NULL        -- W7
    WHEN 'idle'       THEN NULL        -- W7
    ELSE 'warning'                     -- estado desconhecido é cegueira
  END
$$;

COMMENT ON FUNCTION public.deliverability_alert_severity(text, bigint) IS
  'Onda 247 (W1-W7): severidade derivada da entrega. Espelho de deliverabilityAlertSeverity.';

-- ---------------------------------------------------------------------------
-- W8 — cooldown derivado da cadência, entre piso (60) e teto (1440).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deliverability_cooldown(
  p_cadence_minutes int,
  p_severity text
) RETURNS int
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  v_base int;
BEGIN
  IF p_cadence_minutes IS NULL OR p_cadence_minutes <= 0 THEN
    RAISE EXCEPTION 'cadencia invalida para cooldown: %', p_cadence_minutes;
  END IF;
  v_base := CASE WHEN p_severity = 'critical'
                 THEN round(p_cadence_minutes::numeric / 2)::int
                 ELSE p_cadence_minutes END;
  RETURN LEAST(1440, GREATEST(60, v_base));
END;
$$;

-- ---------------------------------------------------------------------------
-- V1–V10 — veredito de entregabilidade lido do livro de execuções.
-- Retorna jsonb com os dois eixos separados (pontualidade e entrega).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assess_dispatch_deliverability(
  p_now timestamptz DEFAULT now(),
  p_cadence_minutes int DEFAULT 60
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  grace_minutes constant int := 15;
  v_now        timestamptz := COALESCE(p_now, now());
  v_run        public.maintenance_dispatch_runs%ROWTYPE;
  v_minutes    numeric;
  v_punct      text;
  v_delivery   text;
  v_channels   text[];
  v_open_crit  bigint;
  v_unnotified bigint;
  v_reasons    text[] := ARRAY[]::text[];
BEGIN
  -- Críticos abertos sem reconhecimento: o número que o plantão entende.
  SELECT count(*) INTO v_open_crit
  FROM public.maintenance_alert_events e
  WHERE e.severity = 'critical'
    AND e.acknowledged_at IS NULL;

  -- V7 — execução no futuro não compra frescor: é descartada e a busca segue.
  SELECT * INTO v_run
  FROM public.maintenance_dispatch_runs r
  WHERE r.ran_at <= v_now
  ORDER BY r.ran_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    -- V1 — ausência de registro nunca é saúde.
    RETURN jsonb_build_object(
      'punctuality', 'unknown',
      'delivery', 'unknown',
      'health', 'unknown',
      'minutes_since_run', NULL,
      'last_run_at', NULL,
      'channels', '[]'::jsonb,
      'unnotified_critical', COALESCE(v_open_crit, 0),
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

  -- Canais normalizados: sem vazio, sem duplicata, ordem estável.
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
    v_reasons := v_reasons || CASE WHEN COALESCE(v_open_crit, 0) > 0
      THEN format('nenhum canal configurado com %s crítico(s) aberto(s) — ninguém foi avisado', v_open_crit)
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
  v_unnotified := CASE WHEN v_delivery IN ('muted', 'failing')
                       THEN COALESCE(v_open_crit, 0) ELSE 0 END;

  RETURN jsonb_build_object(
    'punctuality', v_punct,
    'delivery', v_delivery,
    'health', CASE
      -- V6 — o pior eixo governa; nenhuma média, nenhuma maioria.
      WHEN v_punct = 'stalled' OR v_delivery = 'failing'
           OR (v_delivery = 'muted' AND v_unnotified > 0) THEN 'critical'
      WHEN v_delivery = 'unreadable' THEN 'unknown'
      WHEN v_punct = 'late' OR v_delivery IN ('degraded', 'muted') THEN 'warning'
      ELSE 'ok'
    END,
    'minutes_since_run', round(v_minutes)::int,
    'last_run_at', v_run.ran_at,
    'channels', to_jsonb(v_channels),
    'unnotified_critical', v_unnotified,
    'open_critical', COALESCE(v_open_crit, 0),
    'reasons', to_jsonb(v_reasons)
  );
END;
$$;

COMMENT ON FUNCTION public.assess_dispatch_deliverability(timestamptz, int) IS
  'Onda 247: espelho SQL de assessDeliverability (V1-V10). Pontualidade e entrega são eixos separados.';

-- ---------------------------------------------------------------------------
-- Emissão no barramento (W9/W10): auto-referência declarada, nunca escondida.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_deliverability_alerts(
  p_now timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cadence_minutes constant int  := 60;
  v_key    constant text := 'dispatch_deliverability:maintenance_alerts_dispatch';
  v_label  constant text := 'Despacho externo de manutenção';
  v_self_note constant text :=
    ' — ATENÇÃO: este aviso não sai por canal externo (o canal é justamente o que falhou) e só será visto no console de manutenção';
  v_now       timestamptz := COALESCE(p_now, now());
  v_verdict   jsonb;
  v_delivery  text;
  v_severity  text;
  v_cooldown  int;
  v_waiting   bigint;
  v_minutes   int;
  v_channels  text;
  v_selfref   boolean;
  v_head      text;
  v_reason    text;
  v_emitted   int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  v_verdict  := public.assess_dispatch_deliverability(v_now, cadence_minutes);
  v_delivery := v_verdict->>'delivery';
  v_waiting  := COALESCE((v_verdict->>'unnotified_critical')::bigint, 0);
  v_severity := public.deliverability_alert_severity(v_delivery, v_waiting);

  IF v_severity IS NULL THEN
    RETURN jsonb_build_object(
      'evaluated_at', v_now, 'routine', v_key,
      'delivery', v_delivery, 'severity', 'none', 'emitted', 0
    );
  END IF;

  v_cooldown := public.deliverability_cooldown(cadence_minutes, v_severity);
  -- W9 — comprometido é exatamente o conjunto em que o próprio aviso não sai.
  v_selfref  := v_delivery IN ('muted', 'failing', 'unknown', 'unreadable');
  v_minutes  := (v_verdict->>'minutes_since_run')::int;

  v_channels := CASE
    WHEN jsonb_array_length(COALESCE(v_verdict->'channels', '[]'::jsonb)) = 0
      THEN 'nenhum canal configurado'
    ELSE 'canais: ' || array_to_string(
      ARRAY(SELECT jsonb_array_elements_text(v_verdict->'channels')), ', ')
  END;

  v_head := CASE v_delivery
    WHEN 'muted'      THEN format('%s: despachante mudo — nenhum canal externo configurado', v_label)
    WHEN 'failing'    THEN format('%s: nenhum envio saiu apesar de canal configurado', v_label)
    WHEN 'degraded'   THEN format('%s: entrega parcial — parte dos envios falhou', v_label)
    WHEN 'unknown'    THEN format('%s: nenhuma execução legível registrada — entrega não comprovada', v_label)
    WHEN 'unreadable' THEN format('%s: contabilidade da execução não fecha — entrega não atestável', v_label)
    ELSE format('%s: estado de entrega ''%s'' não reconhecido', v_label, v_delivery)
  END;

  -- W10 — a acusação sempre carrega os números que a sustentam.
  v_reason := format('%s (%s, %s, %s crítico(s) sem aviso, cadência %s min)%s',
    v_head,
    CASE WHEN v_minutes IS NULL THEN 'sem execução registrada'
         ELSE format('última execução há %s min', v_minutes) END,
    v_channels, v_waiting, cadence_minutes,
    CASE WHEN v_selfref THEN v_self_note ELSE '' END);

  IF NOT EXISTS (
    SELECT 1 FROM public.maintenance_alert_events e
    WHERE e.routine = v_key
      AND e.severity = v_severity
      AND e.created_at > v_now - make_interval(mins => v_cooldown)
  ) THEN
    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
    VALUES (
      v_key, v_severity, v_reason,
      jsonb_build_object(
        'job_name',            'maintenance_alerts_dispatch',
        'delivery',            v_delivery,
        'punctuality',         v_verdict->>'punctuality',
        'health',              v_verdict->>'health',
        'minutes_since_run',   v_minutes,
        'last_run_at',         v_verdict->>'last_run_at',
        'channels',            COALESCE(v_verdict->'channels', '[]'::jsonb),
        'unnotified_critical', v_waiting,
        'self_referential',    v_selfref,
        'cadence_minutes',     cadence_minutes,
        'cooldown_minutes',    v_cooldown
      ),
      COALESCE((v_verdict->>'last_run_at')::timestamptz, v_now)
    );
    v_emitted := 1;
  END IF;

  RETURN jsonb_build_object(
    'evaluated_at', v_now, 'routine', v_key,
    'delivery', v_delivery, 'severity', v_severity,
    'self_referential', v_selfref,
    'cooldown_minutes', v_cooldown, 'emitted', v_emitted,
    'verdict', v_verdict
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_deliverability_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.assess_dispatch_deliverability(timestamptz, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assess_dispatch_deliverability(timestamptz, int) TO authenticated;

-- ---------------------------------------------------------------------------
-- Autoteste dinâmico: gate estático não prova execução (lição da Onda 141).
-- Exercita cada lei em transação interna e desfaz tudo ao final.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deliverability_alert_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fail text[] := ARRAY[]::text[];
  v_pass int := 0;
BEGIN
  -- W2 — mudez com crítico aberto é crítica; sem crítico é aviso.
  IF public.deliverability_alert_severity('muted', 205) IS DISTINCT FROM 'critical'
  THEN v_fail := v_fail || 'W2: muted com crítico não foi critical'; ELSE v_pass := v_pass + 1; END IF;
  IF public.deliverability_alert_severity('muted', 0) IS DISTINCT FROM 'warning'
  THEN v_fail := v_fail || 'W2: muted sem crítico não foi warning'; ELSE v_pass := v_pass + 1; END IF;

  -- W3 — canal configurado que não entrega é sempre crítico.
  IF public.deliverability_alert_severity('failing', 0) IS DISTINCT FROM 'critical'
  THEN v_fail := v_fail || 'W3: failing sem crítico não foi critical'; ELSE v_pass := v_pass + 1; END IF;

  -- W4/W6 — degradação e ilegibilidade nunca escalam.
  IF public.deliverability_alert_severity('degraded', 999) IS DISTINCT FROM 'warning'
  THEN v_fail := v_fail || 'W4: degraded escalou'; ELSE v_pass := v_pass + 1; END IF;
  IF public.deliverability_alert_severity('unreadable', 999) IS DISTINCT FROM 'warning'
  THEN v_fail := v_fail || 'W6: unreadable escalou'; ELSE v_pass := v_pass + 1; END IF;

  -- W5 — ignorância nunca é silêncio.
  IF public.deliverability_alert_severity('unknown', 0) IS DISTINCT FROM 'warning'
  THEN v_fail := v_fail || 'W5: unknown virou silêncio'; ELSE v_pass := v_pass + 1; END IF;
  IF public.deliverability_alert_severity('unknown', 1) IS DISTINCT FROM 'critical'
  THEN v_fail := v_fail || 'W5: unknown com crítico não agravou'; ELSE v_pass := v_pass + 1; END IF;

  -- W7 — saúde e ociosidade não emitem.
  IF public.deliverability_alert_severity('delivering', 5) IS NOT NULL
  THEN v_fail := v_fail || 'W7: delivering emitiu'; ELSE v_pass := v_pass + 1; END IF;
  IF public.deliverability_alert_severity('idle', 5) IS NOT NULL
  THEN v_fail := v_fail || 'W7: idle emitiu'; ELSE v_pass := v_pass + 1; END IF;

  -- W8 — crítico nunca reaparece mais devagar que aviso; faixa respeitada.
  IF public.deliverability_cooldown(60, 'critical') > public.deliverability_cooldown(60, 'warning')
  THEN v_fail := v_fail || 'W8: crítico mais lento que aviso'; ELSE v_pass := v_pass + 1; END IF;
  IF public.deliverability_cooldown(99999, 'warning') <> 1440
  THEN v_fail := v_fail || 'W8: teto rompido'; ELSE v_pass := v_pass + 1; END IF;
  IF public.deliverability_cooldown(1, 'warning') <> 60
  THEN v_fail := v_fail || 'W8: piso rompido'; ELSE v_pass := v_pass + 1; END IF;

  -- Cadência inválida falha alto em vez de silenciar.
  BEGIN
    PERFORM public.deliverability_cooldown(0, 'warning');
    v_fail := v_fail || 'W8: cadência zero não falhou alto';
  EXCEPTION WHEN OTHERS THEN v_pass := v_pass + 1;
  END;

  -- O veredito real do banco precisa ser legível e ter os dois eixos.
  IF (public.assess_dispatch_deliverability(now(), 60) ? 'delivery') IS NOT TRUE
     OR (public.assess_dispatch_deliverability(now(), 60) ? 'punctuality') IS NOT TRUE
  THEN v_fail := v_fail || 'veredito sem eixos separados'; ELSE v_pass := v_pass + 1; END IF;

  RETURN jsonb_build_object(
    'ok', cardinality(v_fail) = 0,
    'passed', v_pass,
    'failures', to_jsonb(v_fail)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.deliverability_alert_selftest() FROM PUBLIC, anon, authenticated;