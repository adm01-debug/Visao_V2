-- Onda 244 — Carência de estreia das rotinas de retenção.
--
-- Defeito: `evaluate_retention_alerts` tratava `max(executed_at) IS NULL` como
-- `never` (crítico imediato). Para uma rotina recém-registrada isso é um
-- crítico FALSO: entre o registro e a primeira execução do cron existe uma
-- janela legítima de até uma cadência inteira. Ruído crítico treina o operador
-- a ignorar a classe toda — exatamente o que as Ondas 240–242 combatem.
--
-- Correção: o registro passa a declarar `registered_at`. Sem execução e dentro
-- de `registered_at + cadence + grace` o veredito é `pending_first_run` (sem
-- alerta). Fora disso volta a ser crítico — e agora com prova de que a rotina
-- nasceu quebrada. Registro ausente/futuro NUNCA compra silêncio.

DROP FUNCTION IF EXISTS public.retention_routine_registry();

CREATE FUNCTION public.retention_routine_registry()
RETURNS TABLE(
  job_name        text,
  source_table    text,
  cadence_minutes integer,
  label           text,
  registered_at   timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  VALUES
    ('admission_ledger',       'admission_ledger_purge_runs',        1440, 'Janelas do livro de admissão',          timestamptz '2026-07-20 00:00:00+00'),
    ('admission_reconcile',    'admission_reconcile_purge_runs',     1440, 'Fotos de conciliação da admissão',      timestamptz '2026-07-26 00:00:00+00'),
    ('agent_discoveries',      'agent_discoveries_purge_runs',       1440, 'Descobertas de agentes locais',         timestamptz '2026-05-01 00:00:00+00'),
    ('agent_relay_tasks',      'agent_relay_purge_runs',             1440, 'Tarefas de relay dos agentes',          timestamptz '2026-05-01 00:00:00+00'),
    ('alarm_recurrence',       'alarm_recurrence_purge_runs',        1440, 'Episódios de reincidência de alarme',   timestamptz '2026-06-10 00:00:00+00'),
    ('collab_entries',         'collab_entry_purge_runs',            1440, 'Entradas da rede colaborativa',         timestamptz '2026-05-20 00:00:00+00'),
    ('collab_notifications',   'collab_notification_purge_runs',       60, 'Avisos da rede colaborativa',           timestamptz '2026-05-20 00:00:00+00'),
    ('dispatch_suppressions',  'maintenance_suppression_purge_runs', 1440, 'Trilha de silêncios do despacho',       timestamptz '2026-07-29 15:15:00+00')
$$;

REVOKE ALL ON FUNCTION public.retention_routine_registry() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retention_routine_registry() TO service_role;

/* -------------------------------------------------------------------------
 * Fan-in com carência de estreia (espelho SQL de `classifyRetentionRoutine`).
 * ---------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION public.evaluate_retention_alerts(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grace          int;
  v_warn_factor    int;
  v_stalled_factor int;

  cooldown_floor   constant int := 60;
  cooldown_ceiling constant int := 360;

  rec              record;
  v_last_run       timestamptz;
  v_silence        numeric;
  v_age            numeric;
  v_warn_after     numeric;
  v_stalled_after  numeric;
  v_debut_after    numeric;
  v_health         text;
  v_severity       text;
  v_reason         text;
  v_cooldown       int;
  v_routine_key    text;
  v_emitted        int := 0;
  v_suppressed     int := 0;
  v_pending        int := 0;
  v_results        jsonb := '[]'::jsonb;
BEGIN
  IF p_now IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'refusal', 'bad_now');
  END IF;

  PERFORM set_config('statement_timeout', '20s', true);

  SELECT t.grace_minutes, t.warn_factor, t.stalled_factor
    INTO v_grace, v_warn_factor, v_stalled_factor
    FROM public.retention_health_thresholds() t;

  FOR rec IN SELECT * FROM public.retention_routine_registry() ORDER BY source_table LOOP
    EXECUTE format('SELECT max(executed_at) FROM public.%I', rec.source_table) INTO v_last_run;

    -- U8: execução no futuro não prova trabalho feito.
    IF v_last_run IS NOT NULL AND v_last_run > p_now THEN
      v_last_run := NULL;
    END IF;

    v_warn_after    := v_warn_factor * rec.cadence_minutes + v_grace;
    v_stalled_after := v_stalled_factor * rec.cadence_minutes + v_grace;
    v_debut_after   := rec.cadence_minutes + v_grace;
    v_routine_key   := 'retention:' || rec.job_name;
    v_cooldown      := least(cooldown_ceiling, greatest(cooldown_floor, rec.cadence_minutes));

    -- U7: registro no futuro é ilegível, nunca carência infinita.
    v_age := CASE
      WHEN rec.registered_at IS NULL OR rec.registered_at > p_now THEN NULL
      ELSE greatest(0, EXTRACT(EPOCH FROM (p_now - rec.registered_at)) / 60.0)
    END;

    IF v_last_run IS NOT NULL THEN
      v_silence := greatest(0, EXTRACT(EPOCH FROM (p_now - v_last_run)) / 60.0);
      v_health := CASE
        WHEN v_silence < v_warn_after    THEN 'ok'
        WHEN v_silence < v_stalled_after THEN 'late'
        ELSE 'stalled'
      END;
    ELSE
      v_silence := NULL;
      v_health := CASE
        WHEN v_age IS NULL           THEN 'never_ran'   -- U4
        WHEN v_age < v_debut_after   THEN 'pending_first_run' -- U5
        ELSE 'never_ran'                                 -- U6
      END;
    END IF;

    v_severity := CASE v_health
      WHEN 'never_ran' THEN 'critical'
      WHEN 'stalled'   THEN 'critical'
      WHEN 'late'      THEN 'warning'
      ELSE NULL
    END;

    IF v_health = 'pending_first_run' THEN
      v_pending := v_pending + 1;
    END IF;

    IF v_severity IS NOT NULL THEN
      v_reason := CASE v_health
        WHEN 'never_ran' THEN
          CASE WHEN v_age IS NULL
            THEN format('%s: rotina de expurgo nunca executou e não há data de registro para justificar', rec.label)
            ELSE format('%s: registrada há %s min e nunca executou (cadência de %s min)',
                        rec.label, round(v_age), rec.cadence_minutes)
          END
        ELSE
          format('%s: sem expurgo há %s min (cadência de %s min)',
                 rec.label, round(v_silence), rec.cadence_minutes)
      END;

      IF public.emit_maintenance_alert(v_routine_key, v_severity, v_reason, v_cooldown, p_now) THEN
        v_emitted := v_emitted + 1;
      ELSE
        v_suppressed := v_suppressed + 1;
      END IF;
    END IF;

    v_results := v_results || jsonb_build_object(
      'job_name', rec.job_name,
      'health', v_health,
      'severity', coalesce(v_severity, 'none'),
      'silence_minutes', v_silence,
      'age_minutes', v_age
    );
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'evaluated_at', p_now,
    'emitted', v_emitted,
    'suppressed', v_suppressed,
    'pending_first_run', v_pending,
    'routines', v_results
  );
END;
$$;

REVOKE ALL ON FUNCTION public.evaluate_retention_alerts(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.evaluate_retention_alerts(timestamptz) TO service_role;

/* -------------------------------------------------------------------------
 * Autoteste dinâmico: prova as leis U3–U8 sem deixar resíduo.
 * ---------------------------------------------------------------------- */
CREATE OR REPLACE FUNCTION public.retention_debut_selftest()
RETURNS TABLE(check_name text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now    timestamptz := timestamptz '2099-06-01 00:00:00+00';
  v_res    jsonb;
  v_row    jsonb;
BEGIN
  -- Relógio nulo recusa sem efeito colateral.
  v_res := public.evaluate_retention_alerts(NULL);
  RETURN QUERY SELECT 'recusa_relogio_nulo',
                      (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_now',
                      v_res::text;

  -- Avaliação num futuro distante: toda rotina já passou da carência de
  -- estreia, então nenhuma pode ficar em `pending_first_run`.
  v_res := public.evaluate_retention_alerts(v_now);
  RETURN QUERY SELECT 'futuro_sem_carencia',
                      (v_res->>'pending_first_run')::int = 0,
                      v_res->>'pending_first_run';

  -- Toda rotina do registro aparece no resultado, com veredito conhecido.
  RETURN QUERY
    SELECT 'vereditos_conhecidos',
           bool_and(r->>'health' IN ('ok','late','stalled','pending_first_run','never_ran')),
           string_agg(r->>'job_name' || '=' || (r->>'health'), ',')
      FROM jsonb_array_elements(v_res->'routines') r;

  RETURN QUERY
    SELECT 'cobertura_registro',
           jsonb_array_length(v_res->'routines') = (SELECT count(*)::int FROM public.retention_routine_registry()),
           jsonb_array_length(v_res->'routines')::text;

  -- Rotina nunca executada, avaliada logo após o registro, fica em carência.
  SELECT to_jsonb(x) INTO v_row
    FROM (
      SELECT job_name, registered_at, cadence_minutes
        FROM public.retention_routine_registry()
       WHERE job_name = 'dispatch_suppressions'
    ) x;

  v_res := public.evaluate_retention_alerts(
    (v_row->>'registered_at')::timestamptz + interval '1 minute'
  );
  RETURN QUERY
    SELECT 'estreia_em_carencia',
           (SELECT r->>'health' = 'pending_first_run'
              FROM jsonb_array_elements(v_res->'routines') r
             WHERE r->>'job_name' = 'dispatch_suppressions'),
           v_res->'routines'::text;

  -- Passada a carência, a mesma rotina sem execução vira crítica.
  v_res := public.evaluate_retention_alerts(
    (v_row->>'registered_at')::timestamptz
      + ((v_row->>'cadence_minutes')::int + 16) * interval '1 minute'
  );
  RETURN QUERY
    SELECT 'estreia_perdida_critica',
           (SELECT r->>'health' = 'never_ran' AND r->>'severity' = 'critical'
              FROM jsonb_array_elements(v_res->'routines') r
             WHERE r->>'job_name' = 'dispatch_suppressions'),
           v_res->'routines'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.retention_debut_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retention_debut_selftest() TO service_role;