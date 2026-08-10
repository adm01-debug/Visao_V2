-- Onda 177 parte 2: imutabilidade sem travar remoção legítima do alarme pai.
CREATE OR REPLACE FUNCTION public.block_alert_treatment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Em cascata (alarme já removido) o histórico acompanha o pai.
    IF NOT EXISTS (SELECT 1 FROM public.event_alerts WHERE id = OLD.alert_id) THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'event_alert_treatments é imutável (append-only)';
  END IF;
  RAISE EXCEPTION 'event_alert_treatments é imutável (append-only)';
END;
$$;

-- ===== Exercício dinâmico: rotina só é pronta depois de executada =====
DO $$
DECLARE
  v_org uuid;
  v_alert uuid;
  v_actor uuid := gen_random_uuid();
  v_err text;
BEGIN
  SELECT id INTO v_org FROM public.organizations ORDER BY created_at LIMIT 1;
  IF v_org IS NULL THEN
    RAISE NOTICE 'Onda 177: sem organização para exercitar; verificação adiada';
    RETURN;
  END IF;
  INSERT INTO public.event_alerts(organization_id, title)
    VALUES (v_org, 'w177-selftest') RETURNING id INTO v_alert;

  -- 1. pular reconhecimento
  BEGIN
    UPDATE public.event_alerts SET status='resolved', resolved_by=v_actor,
      resolution_note='x y z', resolution_code='incident_confirmed' WHERE id=v_alert;
    RAISE EXCEPTION 'FALHA 1: open->resolved deveria ser rejeitado';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- 2. reconhecer sem autor
  BEGIN
    UPDATE public.event_alerts SET status='acknowledged' WHERE id=v_alert;
    RAISE EXCEPTION 'FALHA 2: acknowledge sem autor deveria ser rejeitado';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- 3. reconhecer com autor
  UPDATE public.event_alerts SET status='acknowledged', acknowledged_by=v_actor WHERE id=v_alert;

  -- 4. encerrar sem motivo
  BEGIN
    UPDATE public.event_alerts SET status='resolved', resolved_by=v_actor,
      resolution_code='incident_confirmed' WHERE id=v_alert;
    RAISE EXCEPTION 'FALHA 4: resolve sem motivo deveria ser rejeitado';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- 5. código de descarte não resolve
  BEGIN
    UPDATE public.event_alerts SET status='resolved', resolved_by=v_actor,
      resolution_note='ruido de arvore', resolution_code='false_positive' WHERE id=v_alert;
    RAISE EXCEPTION 'FALHA 5: código de descarte não pode resolver';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- 6. resolução válida
  UPDATE public.event_alerts SET status='resolved', resolved_by=v_actor,
    resolution_note='viatura acionada', resolution_code='incident_confirmed' WHERE id=v_alert;

  -- 7. trilha imutável
  INSERT INTO public.event_alert_treatments
    (alert_id, organization_id, action, from_status, to_status, actor_id)
    VALUES (v_alert, v_org, 'acknowledge', 'open', 'acknowledged', v_actor);
  BEGIN
    UPDATE public.event_alert_treatments SET note='adulterado' WHERE alert_id=v_alert;
    RAISE EXCEPTION 'FALHA 7: trilha deveria ser imutável';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err NOT LIKE '%imutável%' THEN RAISE; END IF;
  END;

  -- 8. delete direto da trilha bloqueado
  BEGIN
    DELETE FROM public.event_alert_treatments WHERE alert_id=v_alert;
    RAISE EXCEPTION 'FALHA 8: delete direto da trilha deveria ser bloqueado';
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    IF v_err NOT LIKE '%imutável%' THEN RAISE; END IF;
  END;

  -- 9. RPC sem sessão exige autenticação
  BEGIN
    PERFORM public.treat_event_alert(v_alert, 'reopen', NULL, NULL);
    RAISE EXCEPTION 'FALHA 9: RPC sem auth deveria ser rejeitada';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  -- 10. cascata remove a trilha junto com o alarme
  DELETE FROM public.event_alerts WHERE id = v_alert;
  IF EXISTS (SELECT 1 FROM public.event_alert_treatments WHERE alert_id = v_alert) THEN
    RAISE EXCEPTION 'FALHA 10: trilha órfã após remoção do alarme';
  END IF;

  RAISE NOTICE 'Onda 177: 10 cenários validados';
END $$;