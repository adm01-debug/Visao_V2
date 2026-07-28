-- Onda 222 — exercício dinâmico das guardas de agenda (S8).
-- Gate estático não prova execução: aqui cada guarda é violada de verdade e
-- desfeita, mais duas contraprovas para o teto não virar veto geral.

CREATE OR REPLACE FUNCTION public.alarm_schedule_selftest()
RETURNS TABLE (case_name text, outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  UUID := '00000000-0000-0000-0000-0000000a2290';
  v_act  JSONB := jsonb_build_array(jsonb_build_object('id','a1','kind','email'));
  v_seven JSONB;
BEGIN
  -- 7 períodos num único dia (o sétimo é o excedente)
  SELECT jsonb_build_array(
           (SELECT jsonb_agg(jsonb_build_object('startMin', g*60, 'endMin', g*60 + 30))
              FROM generate_series(0,6) g),
           '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
    INTO v_seven;

  -- Contraprova 1: agenda ausente é 24x7 declarado e precisa ser aceita.
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2201', v_uid, 'selftest 24x7', 'intrusion',
            ARRAY['cam-1'], v_act, NULL);
    case_name := 'schedule_null_always_on'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_null_always_on'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- Contraprova 2: janela que cruza a meia-noite é legítima (G4).
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2202', v_uid, 'selftest noturno', 'intrusion',
            ARRAY['cam-1'], v_act,
            '[[{"startMin":1320,"endMin":360}],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_cross_midnight_ok'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_cross_midnight_ok'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- Contraprova 3: períodos que apenas se encostam não se sobrepõem.
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2203', v_uid, 'selftest encosta', 'intrusion',
            ARRAY['cam-1'], v_act,
            '[[{"startMin":480,"endMin":720},{"startMin":720,"endMin":780}],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_touching_ok'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_touching_ok'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H1: agenda sem os 7 dias
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2204', v_uid, 'selftest 6 dias', 'intrusion',
            ARRAY['cam-1'], v_act, '[[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_wrong_day_count'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_wrong_day_count'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H2: sétimo período no mesmo dia
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2205', v_uid, 'selftest 7 periodos', 'intrusion',
            ARRAY['cam-1'], v_act, v_seven);
    case_name := 'schedule_too_many_periods'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_too_many_periods'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H3: período de duração zero (ambíguo entre "nada" e "24h")
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2206', v_uid, 'selftest zero', 'intrusion',
            ARRAY['cam-1'], v_act,
            '[[{"startMin":480,"endMin":480}],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_degenerate_period'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_degenerate_period'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H4: sobreposição simples
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2207', v_uid, 'selftest sobrepoe', 'intrusion',
            ARRAY['cam-1'], v_act,
            '[[{"startMin":480,"endMin":720},{"startMin":660,"endMin":780}],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_overlap'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_overlap'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H5: sobreposição só visível ao expandir o cruzamento da meia-noite
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2208', v_uid, 'selftest sobrepoe noturno', 'intrusion',
            ARRAY['cam-1'], v_act,
            '[[{"startMin":1320,"endMin":360},{"startMin":300,"endMin":420}],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_overlap_midnight'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_overlap_midnight'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H6: minuto fora do eixo do dia
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2209', v_uid, 'selftest fora do dia', 'intrusion',
            ARRAY['cam-1'], v_act,
            '[[{"startMin":1440,"endMin":100}],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_out_of_day'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_out_of_day'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H7: período malformado (texto no lugar do objeto)
  BEGIN
    INSERT INTO public.alarm_schemes (id, user_id, name, event_type, source_ids, actions, schedule)
    VALUES ('00000000-0000-0000-0000-0000000a2210', v_uid, 'selftest malformado', 'intrusion',
            ARRAY['cam-1'], v_act, '[["08:00"],[],[],[],[],[],[]]'::jsonb);
    case_name := 'schedule_malformed_period'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_malformed_period'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- H8: a guarda também vale na alteração, não só na inserção
  BEGIN
    UPDATE public.alarm_schemes
       SET schedule = '[[{"startMin":480,"endMin":720},{"startMin":660,"endMin":780}],[],[],[],[],[],[]]'::jsonb
     WHERE id = '00000000-0000-0000-0000-0000000a2201';
    case_name := 'schedule_update_guard'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'schedule_update_guard'; outcome := SQLERRM; RETURN NEXT;
  END;

  DELETE FROM public.alarm_schemes WHERE user_id = v_uid;
  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_schedule_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.alarm_schedule_selftest() TO service_role;