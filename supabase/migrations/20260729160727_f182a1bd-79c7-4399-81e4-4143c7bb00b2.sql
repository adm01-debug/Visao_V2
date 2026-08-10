-- Onda 248 — prova adversarial executada de verdade.
--
-- Memória do projeto: gate estático não substitui execução. A lei X2 só está
-- provada se reconhecermos TODOS os críticos no banco real e a acusação não
-- se mover. O bloco EXCEPTION cria uma subtransação: o RAISE desfaz o UPDATE
-- sem tocar nos dados de produção.
CREATE OR REPLACE FUNCTION public.acknowledgement_decay_selftest()
RETURNS TABLE(guard text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  t0 timestamptz := timestamptz '2026-07-29 16:00:00+00';
  j  jsonb;
  v_before  bigint;
  v_after   bigint;
  v_h_before text;
  v_h_after  text;
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

  -- ---- Prova adversarial da lei X2, com mutação real e desfeita. ----------
  v_before   := public.undelivered_critical_count();
  v_h_before := public.assess_dispatch_deliverability()->>'health';

  BEGIN
    UPDATE public.maintenance_alert_events
       SET acknowledged_at = now()
     WHERE severity = 'critical' AND acknowledged_at IS NULL;

    v_after   := public.undelivered_critical_count();
    v_h_after := public.assess_dispatch_deliverability()->>'health';

    -- Desfaz a subtransação: produção permanece intocada.
    RAISE EXCEPTION 'rollback-proposital';
  EXCEPTION WHEN others THEN
    IF SQLERRM <> 'rollback-proposital' THEN
      v_after := -1; v_h_after := SQLERRM;
    END IF;
  END;

  RETURN QUERY SELECT 'X2 reconhecer TUDO não move a acusação',
    v_after = v_before AND v_h_after = v_h_before,
    format('%s -> %s críticos sem entrega; saúde %s -> %s',
           v_before, v_after, v_h_before, v_h_after);

  RETURN QUERY SELECT 'X2 mutação adversarial foi desfeita',
    public.undelivered_critical_count() = v_before
    AND public.laundered_critical_count() < v_before,
    format('%s não entregues, %s lavados',
           public.undelivered_critical_count(), public.laundered_critical_count());
END;
$function$;

REVOKE ALL ON FUNCTION public.acknowledgement_decay_selftest() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.acknowledgement_decay_selftest() TO service_role;