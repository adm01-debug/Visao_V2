-- Onda 151 — exercício dinâmico do console de concessões.
-- Executado em transação REVERTIDA pelo gate `npm run db:check:grant-console`.
--
-- Por que exercitar: migração aplicar sem erro não prova que a admissão
-- recusa o que deve recusar. Permissão indevida não lança exceção — ela
-- simplesmente concede, em silêncio.

BEGIN;


DO $exercise$
DECLARE
  v_admin  uuid := '11111111-1111-4111-8111-111111111111';
  v_admin2 uuid := '22222222-2222-4222-8222-222222222222';
  v_viewer uuid := '33333333-3333-4333-8333-333333333333';
  v_grant  uuid;
  v_msg    text;
  v_ok     boolean;
  v_count  int;
BEGIN
  DELETE FROM public.user_roles WHERE user_id IN (v_admin, v_admin2, v_viewer);
  INSERT INTO public.user_roles (user_id, role) VALUES
    (v_admin, 'admin'), (v_admin2, 'admin'), (v_viewer, 'viewer');

  -- ator = admin
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);

  -- 1. concessão legítima
  v_grant := public.grant_capability(
    v_viewer, 'cameras.ptz.control', 'grant', 'tecnico terceirizado', now() + interval '7 days');
  IF v_grant IS NULL THEN RAISE EXCEPTION 'FALHA 1: concessão legítima não retornou id'; END IF;
  IF NOT public.has_capability(v_viewer, 'cameras.ptz.control') THEN
    RAISE EXCEPTION 'FALHA 1b: capacidade concedida não apareceu no conjunto efetivo';
  END IF;
  SELECT count(*) INTO v_count FROM public.user_capability_grant_audit
   WHERE grant_id = v_grant AND action = 'granted';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FALHA 1c: trilha não registrou a concessão'; END IF;

  -- 2. auto-concessão
  BEGIN
    PERFORM public.grant_capability(v_admin, 'cameras.view', 'deny', 'motivo qualquer', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 2: auto-concessão foi aceita';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'self_grant' THEN RAISE EXCEPTION 'FALHA 2b: motivo inesperado %', v_msg; END IF;
  END;

  -- 3. sem prazo
  BEGIN
    PERFORM public.grant_capability(v_viewer, 'cameras.manage', 'grant', 'motivo qualquer', NULL);
    RAISE EXCEPTION 'FALHA 3: concessão sem prazo foi aceita';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'expiry_required' THEN RAISE EXCEPTION 'FALHA 3b: motivo inesperado %', v_msg; END IF;
  END;

  -- 4. prazo além do teto
  BEGIN
    PERFORM public.grant_capability(v_viewer, 'cameras.manage', 'grant', 'motivo qualquer', now() + interval '91 days');
    RAISE EXCEPTION 'FALHA 4: prazo acima de 90 dias foi aceito';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'expiry_too_far' THEN RAISE EXCEPTION 'FALHA 4b: motivo inesperado %', v_msg; END IF;
  END;

  -- 5. redundante (piso do viewer já dá cameras.view)
  BEGIN
    PERFORM public.grant_capability(v_viewer, 'cameras.view', 'grant', 'motivo qualquer', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 5: concessão redundante foi aceita';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'redundant_grant' THEN RAISE EXCEPTION 'FALHA 5b: motivo inesperado %', v_msg; END IF;
  END;

  -- 6. capacidade órfã
  BEGIN
    PERFORM public.grant_capability(v_viewer, 'cameras.teleport', 'grant', 'motivo qualquer', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 6: capacidade fora do catálogo foi aceita';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'unknown_capability' THEN RAISE EXCEPTION 'FALHA 6b: motivo inesperado %', v_msg; END IF;
  END;

  -- 7. justificativa curta
  BEGIN
    PERFORM public.grant_capability(v_viewer, 'cameras.manage', 'grant', 'ok', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 7: justificativa curta foi aceita';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'reason_required' THEN RAISE EXCEPTION 'FALHA 7b: motivo inesperado %', v_msg; END IF;
  END;

  -- 8. anti-lockout: negar users.grant_capability de um admin
  BEGIN
    PERFORM public.grant_capability(v_admin2, 'users.grant_capability', 'deny', 'motivo qualquer', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 8: deny anti-lockout foi aceito';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'ineffective_deny' THEN RAISE EXCEPTION 'FALHA 8b: motivo inesperado %', v_msg; END IF;
  END;

  -- 9. deny inócuo (alvo não possui)
  BEGIN
    PERFORM public.grant_capability(v_viewer, 'recordings.delete', 'deny', 'motivo qualquer', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 9: deny sem efeito foi aceito';
  EXCEPTION WHEN sqlstate '22023' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'ineffective_deny' THEN RAISE EXCEPTION 'FALHA 9b: motivo inesperado %', v_msg; END IF;
  END;

  -- 10. ator sem users.grant_capability
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_viewer)::text, true);
  BEGIN
    PERFORM public.grant_capability(v_admin2, 'cameras.view', 'deny', 'motivo qualquer', now() + interval '1 day');
    RAISE EXCEPTION 'FALHA 10: ator sem permissão conseguiu conceder';
  EXCEPTION WHEN sqlstate '42501' THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'actor_missing_capability' THEN RAISE EXCEPTION 'FALHA 10b: motivo inesperado %', v_msg; END IF;
  END;

  -- 11. revogação idempotente
  PERFORM set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
  v_ok := public.revoke_capability_grant(v_grant, 'fim do contrato');
  IF NOT v_ok THEN RAISE EXCEPTION 'FALHA 11: primeira revogação não escreveu'; END IF;
  IF public.has_capability(v_viewer, 'cameras.ptz.control') THEN
    RAISE EXCEPTION 'FALHA 11b: capacidade sobreviveu à revogação';
  END IF;
  v_ok := public.revoke_capability_grant(v_grant, 'de novo');
  IF v_ok THEN RAISE EXCEPTION 'FALHA 11c: revogação repetida escreveu de novo'; END IF;
  SELECT count(*) INTO v_count FROM public.user_capability_grant_audit
   WHERE grant_id = v_grant AND action = 'revoked';
  IF v_count <> 1 THEN RAISE EXCEPTION 'FALHA 11d: revogação duplicada na trilha (%)', v_count; END IF;

  -- 12. trilha imutável
  BEGIN
    UPDATE public.user_capability_grant_audit SET reason = 'adulterado' WHERE grant_id = v_grant;
    RAISE EXCEPTION 'FALHA 12: trilha aceitou UPDATE';
  EXCEPTION WHEN sqlstate '42501' THEN NULL;
  END;
  BEGIN
    DELETE FROM public.user_capability_grant_audit WHERE grant_id = v_grant;
    RAISE EXCEPTION 'FALHA 13: trilha aceitou DELETE';
  EXCEPTION WHEN sqlstate '42501' THEN NULL;
  END;

  RAISE NOTICE 'OK: 13 verificações do console de concessões passaram';
END;
$exercise$;

ROLLBACK;
