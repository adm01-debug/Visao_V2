-- Onda 219 — Autoteste dinâmico das guardas de public.alarm_schemes.
--
-- Gate estático (existência de CHECK/trigger) não prova execução: a Onda 141
-- pegou uma rotina abortando em silêncio há várias ondas. Esta função viola
-- cada guarda de propósito, em savepoints, e relata o veredito. Tudo o que ela
-- cria é desfeito antes de retornar.

CREATE OR REPLACE FUNCTION public.alarm_scheme_selftest()
RETURNS TABLE (case_name TEXT, outcome TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := '00000000-0000-0000-0000-0000000a2190';
  v_many JSONB;
  v_36 JSONB;
BEGIN
  -- 40 canais gravados numa única ação (estoura o teto de 36)
  SELECT jsonb_build_array(jsonb_build_object(
           'id','a1','kind','record',
           'displayChannelIds', '[]'::jsonb,
           'recordChannelIds', (SELECT jsonb_agg('cam-' || g) FROM generate_series(1,40) g)))
    INTO v_many;

  -- exatamente 36: fronteira que deve ser aceita
  SELECT jsonb_build_array(jsonb_build_object(
           'id','a1','kind','display_live',
           'displayChannelIds', (SELECT jsonb_agg('cam-' || g) FROM generate_series(1,36) g),
           'recordChannelIds', '[]'::jsonb))
    INTO v_36;

  -- Caso feliz: o cadastro válido precisa entrar, senão as recusas abaixo não
  -- provam nada (poderiam estar barrando tudo).
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2101', v_uid, 'selftest ok', 'intrusion',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')));
    case_name := 'happy_path'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'happy_path'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G1 (S1): nome sem caractere útil
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2102', v_uid, '   ', 'intrusion',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')));
    case_name := 'name_blank'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'name_blank'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G2 (S1): nome acima de 120
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2103', v_uid, repeat('x', 121), 'intrusion',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')));
    case_name := 'name_too_long'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'name_too_long'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G3 (S2): tipo fora do catálogo
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2104', v_uid, 'selftest tipo', 'evento_generico',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')));
    case_name := 'unknown_event_type'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'unknown_event_type'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G4 (S10): limiar fora da faixa
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, disconnect_threshold_s)
    VALUES ('00000000-0000-0000-0000-0000000a2105', v_uid, 'selftest limiar', 'device_disconnected',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')), 10);
    case_name := 'threshold_out_of_range'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'threshold_out_of_range'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G5 (formato): ações não são um array
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2106', v_uid, 'selftest formato', 'intrusion',
            ARRAY['cam-1'], '{"id":"a1"}'::jsonb);
    case_name := 'actions_not_array'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'actions_not_array'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G6 (S5): teto de canais estourado
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2107', v_uid, 'selftest teto', 'intrusion',
            ARRAY['cam-1'], v_many);
    case_name := 'channel_budget_exceeded'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'channel_budget_exceeded'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G7 (S5): fronteira exata de 36 precisa ser ACEITA (teto não pode virar veto geral)
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2108', v_uid, 'selftest fronteira', 'intrusion',
            ARRAY['cam-1'], v_36);
    case_name := 'channel_budget_boundary_36'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'channel_budget_boundary_36'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G8 (S6): face_recognized sem biblioteca
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions)
    VALUES ('00000000-0000-0000-0000-0000000a2109', v_uid, 'selftest face 0', 'face_recognized',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')));
    case_name := 'face_library_missing'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'face_library_missing'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G9 (S6): face_recognized com duas bibliotecas
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, face_library_ids)
    VALUES ('00000000-0000-0000-0000-0000000a2110', v_uid, 'selftest face 2', 'face_recognized',
            ARRAY['cam-1'], jsonb_build_array(jsonb_build_object('id','a1','kind','email')),
            ARRAY['lib-1','lib-2']);
    case_name := 'face_library_ambiguous'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'face_library_ambiguous'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- G10 (S5 no UPDATE): guarda também vale para alteração, não só inserção
  BEGIN
    UPDATE public.alarm_schemes SET actions = v_many
     WHERE id = '00000000-0000-0000-0000-0000000a2101';
    case_name := 'update_budget_guard'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'update_budget_guard'; outcome := SQLERRM; RETURN NEXT;
  END;

  DELETE FROM public.alarm_schemes WHERE user_id = v_uid;
  RETURN;
END;
$$;

COMMENT ON FUNCTION public.alarm_scheme_selftest() IS
  'Onda 219 — exercício dinâmico das guardas de alarm_schemes. Uso exclusivo do gate de CI.';

REVOKE ALL ON FUNCTION public.alarm_scheme_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alarm_scheme_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.alarm_scheme_selftest() FROM authenticated;