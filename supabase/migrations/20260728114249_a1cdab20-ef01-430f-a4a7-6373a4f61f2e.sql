-- Onda 185: vigia da ponte de episódios travada.
-- Espelho literal de src/lib/retention/episodeBridgeWatch.ts.

CREATE OR REPLACE FUNCTION public.episode_bridge_watch_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'minSamples',            3,
    'trendWindowHours',      72,
    'noiseFloor',            3,
    'warnGrowth',            5,
    'criticalGrowth',        20,
    'absoluteCriticalFloor', 100
  );
$$;

REVOKE ALL ON FUNCTION public.episode_bridge_watch_policy() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.episode_bridge_watch_policy() TO service_role;

CREATE OR REPLACE FUNCTION public.evaluate_abandoned_episode_alerts(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_min_samples    constant int := 3;
  c_window_hours   constant int := 72;
  c_noise_floor    constant int := 3;
  c_warn_growth    constant int := 5;
  c_crit_growth    constant int := 20;
  c_abs_crit_floor constant int := 100;
  c_cooldown_min   constant int := 360;
  c_routine_key    constant text := 'retention:alarm_recurrence_bridge';

  v_samples   int;
  v_baseline  int;
  v_latest    int;
  v_growth    int;
  v_verdict   text;
  v_severity  text;
  v_reason    text;
  v_emitted   int := 0;
BEGIN
  PERFORM set_config('statement_timeout', '20s', true);

  -- Amostras válidas: dentro da janela e nunca no futuro. Leitura com carimbo
  -- adiantado é relógio errado, não informação, e inverteria o sinal da
  -- derivada se virasse a base de comparação.
  WITH win AS (
    SELECT executed_at, abandoned_open
      FROM public.alarm_recurrence_purge_runs
     WHERE executed_at <= p_now
       AND executed_at >= p_now - make_interval(hours => c_window_hours)
       AND abandoned_open >= 0
     ORDER BY executed_at
  )
  SELECT count(*)::int,
         (SELECT abandoned_open FROM win ORDER BY executed_at ASC  LIMIT 1),
         (SELECT abandoned_open FROM win ORDER BY executed_at DESC LIMIT 1)
    INTO v_samples, v_baseline, v_latest
    FROM win;

  IF v_samples < c_min_samples THEN
    -- "Não sei" nunca é "está saudável".
    RETURN jsonb_build_object(
      'verdict', 'insufficient_data', 'severity', NULL,
      'samples', v_samples, 'baseline', COALESCE(v_baseline, 0),
      'latest', COALESCE(v_latest, 0), 'growth', 0, 'emitted', 0
    );
  END IF;

  v_growth := v_latest - v_baseline;

  -- Ordem deliberada: saúde -> teto absoluto -> drenagem -> crescimento.
  -- O teto precede a drenagem porque 400 caindo para 399 segue emergência.
  IF v_latest = 0 THEN
    v_verdict := 'healthy'; v_severity := NULL;
    v_reason  := 'Ponte de episódios: nenhum episódio aberto além do prazo.';
  ELSIF v_latest >= c_abs_crit_floor THEN
    v_verdict := 'stuck'; v_severity := 'critical';
    v_reason  := format('Ponte de episódios travada: %s episódios abertos além do prazo (patamar absoluto >= %s).',
                        v_latest, c_abs_crit_floor);
  ELSIF v_growth <= 0 THEN
    v_verdict := 'draining'; v_severity := NULL;
    v_reason  := format('Ponte de episódios: %s episódio(s) abandonado(s), sem crescimento nas últimas %sh (base %s).',
                        v_latest, c_window_hours, v_baseline);
  ELSIF v_latest < c_noise_floor THEN
    v_verdict := 'tolerated'; v_severity := NULL;
    v_reason  := format('Ponte de episódios: %s episódio(s) abandonado(s) - abaixo do piso de ruído (%s).',
                        v_latest, c_noise_floor);
  ELSIF v_growth >= c_crit_growth THEN
    v_verdict := 'stuck'; v_severity := 'critical';
    v_reason  := format('Ponte de episódios travada: +%s episódios abandonados em %sh (de %s para %s) - episódios não estão sendo fechados.',
                        v_growth, c_window_hours, v_baseline, v_latest);
  ELSIF v_growth >= c_warn_growth THEN
    v_verdict := 'growing'; v_severity := 'warning';
    v_reason  := format('Ponte de episódios acumulando: +%s episódios abandonados em %sh (de %s para %s).',
                        v_growth, c_window_hours, v_baseline, v_latest);
  ELSE
    v_verdict := 'tolerated'; v_severity := NULL;
    v_reason  := format('Ponte de episódios: +%s episódio(s) abandonado(s) em %sh - variação dentro do tolerado.',
                        v_growth, c_window_hours);
  END IF;

  IF v_severity IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.maintenance_alert_events e
     WHERE e.routine = c_routine_key
       AND e.severity = v_severity
       AND e.created_at > p_now - make_interval(mins => c_cooldown_min)
  ) THEN
    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, observed_at)
    VALUES (
      c_routine_key, v_severity, v_reason,
      jsonb_build_object(
        'verdict',  v_verdict,
        'samples',  v_samples,
        'baseline', v_baseline,
        'latest',   v_latest,
        'growth',   v_growth,
        'policy',   public.episode_bridge_watch_policy()
      ),
      p_now
    );
    v_emitted := 1;
  END IF;

  RETURN jsonb_build_object(
    'verdict', v_verdict, 'severity', v_severity, 'samples', v_samples,
    'baseline', v_baseline, 'latest', v_latest, 'growth', v_growth, 'emitted', v_emitted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_abandoned_episode_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_abandoned_episode_alerts(timestamptz) TO service_role;

COMMENT ON FUNCTION public.evaluate_abandoned_episode_alerts(timestamptz) IS
  'Onda 185: converte a contagem de episódios abandonados da trilha de expurgo em alerta de manutenção. Cresce sustentado = ponte de episódios travada. Espelho de src/lib/retention/episodeBridgeWatch.ts.';
