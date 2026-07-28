CREATE OR REPLACE FUNCTION public.escalation_profile_selftest()
RETURNS TABLE (guard TEXT, ok BOOLEAN, detail TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_level SMALLINT;
  v_rows  INT;
  v_prof  TEXT;
  c_slow  TEXT := 'admission_trend:__selftest__';
  c_fast  TEXT := '__selftest_fast__';
  c_warn  TEXT := 'admission_reconcile:__selftest_warn__';
BEGIN
  BEGIN
    -- Defeito B reproduzido: 20 linhas diarias da MESMA condicao lenta, cada
    -- uma jovem, nenhuma reconhecida. Antes da Onda 238 nenhuma escalava.
    FOR i IN 0..19 LOOP
      INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, created_at)
      VALUES (c_slow, 'critical', 'selftest 238', '{}'::JSONB, now() - ((19 - i) || ' days')::INTERVAL);
    END LOOP;

    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, created_at)
    VALUES (c_fast, 'critical', 'selftest 238', '{}'::JSONB, now() - INTERVAL '20 hours');

    -- Um degrau por execucao: entre elas, envelhecemos o ultimo degrau para
    -- vencer o intervalo minimo de ambos os perfis.
    FOR i IN 1..6 LOOP
      PERFORM public.escalate_stale_maintenance_alerts();
      UPDATE public.maintenance_alert_events
         SET last_escalated_at = last_escalated_at - INTERVAL '2 days'
       WHERE routine IN (c_slow, c_fast);
    END LOOP;

    SELECT MAX(escalation_level) INTO v_level
      FROM public.maintenance_alert_events WHERE routine = c_slow;
    guard := 'G1 cronico lento chega ao plantao';
    ok := v_level = 3;
    detail := format('nivel %s', v_level);
    RETURN NEXT;

    SELECT MAX(escalation_level) INTO v_level
      FROM public.maintenance_alert_events WHERE routine = c_fast;
    guard := 'G2 fonte operacional inalterada';
    ok := v_level = 3;
    detail := format('nivel %s', v_level);
    RETURN NEXT;

    SELECT count(*) INTO v_rows
      FROM public.maintenance_alert_escalations e
      JOIN public.maintenance_alert_events ev ON ev.id = e.alert_id
     WHERE ev.routine = c_slow
       AND e.detail->>'profile' = 'slow_accounting'
       AND (e.detail->>'anchored_on_streak')::BOOLEAN;
    guard := 'G3 trilha registra perfil e ancora';
    ok := v_rows > 0;
    detail := format('%s degrau(s)', v_rows);
    RETURN NEXT;

    SELECT e.detail->>'profile' INTO v_prof
      FROM public.maintenance_alert_escalations e
      JOIN public.maintenance_alert_events ev ON ev.id = e.alert_id
     WHERE ev.routine = c_fast LIMIT 1;
    guard := 'G4 fonte nao declarada usa perfil historico';
    ok := v_prof = 'operational';
    detail := coalesce(v_prof, 'sem degrau');
    RETURN NEXT;

    -- G5 — reconhecer quebra a sequencia (O5).
    UPDATE public.maintenance_alert_events SET acknowledged_at = now() WHERE routine = c_slow;
    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, created_at)
    VALUES (c_slow, 'critical', 'pos-ack', '{}'::JSONB, now() - INTERVAL '2 hours');
    PERFORM public.escalate_stale_maintenance_alerts();
    SELECT escalation_level INTO v_level
      FROM public.maintenance_alert_events WHERE routine = c_slow AND acknowledged_at IS NULL;
    guard := 'G5 reconhecimento reancora a condicao';
    ok := v_level = 0;
    detail := format('nivel %s', v_level);
    RETURN NEXT;

    -- G6 — warning lento nunca chega ao plantao.
    INSERT INTO public.maintenance_alert_events (routine, severity, reason, detail, created_at)
    VALUES (c_warn, 'warning', 'selftest 238', '{}'::JSONB, now() - INTERVAL '400 days');
    FOR i IN 1..5 LOOP
      PERFORM public.escalate_stale_maintenance_alerts();
      UPDATE public.maintenance_alert_events SET last_escalated_at = last_escalated_at - INTERVAL '5 days'
       WHERE routine = c_warn;
    END LOOP;
    SELECT escalation_level INTO v_level
      FROM public.maintenance_alert_events WHERE routine = c_warn;
    guard := 'G6 warning lento nao pagina';
    ok := v_level <= 2;
    detail := format('nivel %s', v_level);
    RETURN NEXT;

    -- G7 — o cron so pula degrau quando HERDA nivel da sequencia (O4).
    -- Uma linha nova de condicao ja escalada nasce no nivel da sequencia, e
    -- por isso seu primeiro degrau pode registrar from_level=0 -> to_level=2.
    -- Isso e a ancora funcionando; salto SEM ancora seria defeito grave.
    SELECT count(*) INTO v_rows
      FROM public.maintenance_alert_escalations e
      JOIN public.maintenance_alert_events ev ON ev.id = e.alert_id
     WHERE ev.routine IN (c_slow, c_fast, c_warn)
       AND e.to_level <> e.from_level + 1
       AND COALESCE((e.detail->>'anchored_on_streak')::BOOLEAN, FALSE) IS FALSE;
    guard := 'G7 salto so com ancora';
    ok := v_rows = 0;
    detail := format('%s salto(s)', v_rows);
    RETURN NEXT;

    -- Desfaz tudo: o autoteste nao deixa residuo nem quando roda em producao.
    DELETE FROM public.maintenance_alert_escalations
     WHERE alert_id IN (SELECT id FROM public.maintenance_alert_events
                         WHERE routine IN (c_slow, c_fast, c_warn));
    -- `detail` tambem e nome de parametro OUT: qualificar pelo alias e
    -- obrigatorio, senao o PL/pgSQL recusa a referencia como ambigua.
    DELETE FROM public.maintenance_alert_events ev
     WHERE (ev.detail->>'source_routine') IN (c_slow, c_fast, c_warn);
    DELETE FROM public.maintenance_alert_events ev WHERE ev.routine IN (c_slow, c_fast, c_warn);

    SELECT count(*) INTO v_rows FROM public.maintenance_alert_events ev
     WHERE ev.routine IN (c_slow, c_fast, c_warn)
        OR (ev.detail->>'source_routine') IN (c_slow, c_fast, c_warn);
    guard := 'G8 sem residuo';
    ok := v_rows = 0;
    detail := format('%s linha(s)', v_rows);
    RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    -- Falha no meio do exercicio nao pode deixar lixo para tras.
    DELETE FROM public.maintenance_alert_escalations
     WHERE alert_id IN (SELECT id FROM public.maintenance_alert_events
                         WHERE routine IN (c_slow, c_fast, c_warn));
    DELETE FROM public.maintenance_alert_events ev
     WHERE ev.routine IN (c_slow, c_fast, c_warn)
        OR (ev.detail->>'source_routine') IN (c_slow, c_fast, c_warn);
    guard := 'excecao';
    ok := FALSE;
    detail := SQLERRM;
    RETURN NEXT;
  END;
END;
$function$;