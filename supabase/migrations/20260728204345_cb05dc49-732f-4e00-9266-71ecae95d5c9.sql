-- Onda 226 — admissão de evento no servidor (espelho de src/lib/alarms/eventAdmission.ts).
--
-- A Onda 225 respondeu "está armado agora?". Esta responde a pergunta que o
-- motor realmente faz: "este evento, desta origem, neste instante, vira
-- alarme?". Sem porta única, cada chamador improvisaria a sua regra e o
-- sistema disparia fora da janela declarada na tela.

-- Saúde derivada da linha gravada. Só reproduz o que uma linha **persistida**
-- consegue violar: nome vazio, tipo fora do catálogo e biblioteca de faces já
-- são barrados por CHECK/gatilho, então não se repetem aqui.
CREATE OR REPLACE FUNCTION public.alarm_scheme_stored_health(
  p_source_ids text[],
  p_missing_source_ids text[],
  p_actions jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    -- Sem origem efetiva não escuta nada; sem ação dispara em silêncio.
    -- Ambos são cobertura falsa: inoperante (lei S2/S4).
    WHEN cardinality(
           ARRAY(SELECT unnest(coalesce(p_source_ids, '{}'))
                 EXCEPT SELECT unnest(coalesce(p_missing_source_ids, '{}')))
         ) = 0 THEN 'inoperative'
    WHEN p_actions IS NULL
      OR jsonb_typeof(p_actions) <> 'array'
      OR jsonb_array_length(p_actions) = 0 THEN 'inoperative'
    -- Perder parte das origens degrada, mas segue protegendo o resto (S3).
    WHEN coalesce(cardinality(p_missing_source_ids), 0) > 0 THEN 'inconsistent'
    ELSE 'ok'
  END;
$$;

COMMENT ON FUNCTION public.alarm_scheme_stored_health(text[], text[], jsonb)
  IS 'Onda 226: saúde derivada da linha gravada (S2/S3/S4). ok | inconsistent | inoperative.';

-- Porta única de admissão. Devolve veredito global + motivo + esquemas.
CREATE OR REPLACE FUNCTION public.alarm_admit_event(
  p_user_id uuid,
  p_source_id text,
  p_event_type text,
  p_at timestamptz,
  p_tz_offset_minutes integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source    text := btrim(coalesce(p_source_id, ''));
  v_type      text := btrim(coalesce(p_event_type, ''));
  v_per       jsonb := '[]'::jsonb;
  v_admitting text[] := '{}';
  v_missing   text[] := '{}';
  v_any_clean boolean := false;
  v_reason    text := 'no_scheme';
  v_rank      integer := 10;
  r           record;
  v_health    text;
  v_state     text;
  v_row_reason text;
  v_row_rank  integer;
BEGIN
  IF p_user_id IS NULL OR v_source = '' OR v_type = '' THEN
    RETURN jsonb_build_object(
      'admitted', false, 'reason', 'no_scheme',
      'admittingSchemeIds', '[]'::jsonb, 'perScheme', '[]'::jsonb,
      'missingSourceSchemeIds', '[]'::jsonb);
  END IF;

  FOR r IN
    SELECT s.id, s.enabled, s.schedule, s.source_ids, s.missing_source_ids, s.actions
      FROM public.alarm_schemes s
     WHERE s.user_id = p_user_id
       AND s.event_type = v_type
       AND v_source = ANY (s.source_ids)
     ORDER BY s.created_at, s.id  -- ordem estável de auditoria (lei E7)
  LOOP
    IF v_source = ANY (coalesce(r.missing_source_ids, '{}')) THEN
      -- E3: a origem ficou no cadastro para auditoria, não para alarmar.
      v_missing := v_missing || r.id::text;
      v_state := 'inoperative';
      v_row_reason := 'source_missing';
      v_row_rank := 20;
    ELSE
      v_health := public.alarm_scheme_stored_health(
        r.source_ids, r.missing_source_ids, r.actions);
      v_state := public.alarm_scheme_armed_state(
        r.schedule, r.enabled, v_health, p_at, p_tz_offset_minutes);
      v_row_reason := CASE v_state
        WHEN 'armed'          THEN 'admitted'
        WHEN 'armed_degraded' THEN 'admitted_degraded'
        WHEN 'idle'           THEN 'out_of_window'
        WHEN 'off'            THEN 'disabled'
        WHEN 'inoperative'    THEN 'inoperative'
        ELSE 'indeterminate'
      END;
      v_row_rank := CASE v_row_reason
        WHEN 'indeterminate'  THEN 60
        WHEN 'inoperative'    THEN 50
        WHEN 'out_of_window'  THEN 40
        WHEN 'disabled'       THEN 30
        ELSE 100
      END;
      IF v_state IN ('armed', 'armed_degraded') THEN
        v_admitting := v_admitting || r.id::text;
        IF v_state = 'armed' THEN v_any_clean := true; END IF;
      END IF;
    END IF;

    v_per := v_per || jsonb_build_object(
      'schemeId', r.id::text,
      'state', v_state,
      'admitted', v_state IN ('armed', 'armed_degraded'),
      'reason', v_row_reason);

    IF v_row_rank < 100 AND v_row_rank > v_rank THEN
      v_reason := v_row_reason;  -- E6: motivo mais informativo vence.
      v_rank := v_row_rank;
    END IF;
  END LOOP;

  IF cardinality(v_admitting) > 0 THEN
    -- Ressalva alheia não contamina: basta um esquema íntegro ter admitido.
    v_reason := CASE WHEN v_any_clean THEN 'admitted' ELSE 'admitted_degraded' END;
  END IF;

  RETURN jsonb_build_object(
    'admitted', cardinality(v_admitting) > 0,
    'reason', v_reason,
    'admittingSchemeIds', to_jsonb(v_admitting),
    'perScheme', v_per,
    'missingSourceSchemeIds', to_jsonb(v_missing));
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_admit_event(uuid, text, text, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alarm_admit_event(uuid, text, text, timestamptz, integer) FROM anon;
REVOKE ALL ON FUNCTION public.alarm_admit_event(uuid, text, text, timestamptz, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.alarm_admit_event(uuid, text, text, timestamptz, integer) TO service_role;

COMMENT ON FUNCTION public.alarm_admit_event(uuid, text, text, timestamptz, integer)
  IS 'Onda 226: porta única de admissão de evento (E1-E8). Somente motor (service_role).';

-- Exercício dinâmico com dados reais criados e desfeitos na própria chamada.
CREATE OR REPLACE FUNCTION public.alarm_admission_selftest()
RETURNS TABLE(case_name text, expected text, actual text, ok boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user  uuid;
  v_win   jsonb := '[[],[{"startMin":480,"endMin":600}],[],[],[],[],[]]';
  v_act   jsonb := '[{"id":"popup","channels":1}]';
  v_in    timestamptz := '2026-07-27 09:00:00+00';  -- segunda, dentro
  v_out   timestamptz := '2026-07-27 11:00:00+00';  -- segunda, fora
  v_id    uuid;
BEGIN
  SELECT id INTO v_user FROM auth.users ORDER BY created_at LIMIT 1;
  IF v_user IS NULL THEN
    RETURN QUERY SELECT 'sem usuário para exercitar'::text, 'skip'::text, 'skip'::text, true;
    RETURN;
  END IF;

  CREATE TEMP TABLE _adm(case_name text, expected text, actual text) ON COMMIT DROP;

  INSERT INTO public.alarm_schemes(user_id, name, enabled, event_type, source_ids,
                                   missing_source_ids, actions, schedule)
  VALUES (v_user, 'selftest onda 226', true, 'intrusion', ARRAY['cam-a'],
          '{}', v_act, v_win)
  RETURNING id INTO v_id;

  INSERT INTO _adm VALUES
    ('dentro da janela', 'admitted',
      public.alarm_admit_event(v_user,'cam-a','intrusion',v_in,0) ->> 'reason'),
    ('fora da janela', 'out_of_window',
      public.alarm_admit_event(v_user,'cam-a','intrusion',v_out,0) ->> 'reason'),
    ('origem desconhecida', 'no_scheme',
      public.alarm_admit_event(v_user,'cam-z','intrusion',v_in,0) ->> 'reason'),
    ('tipo desconhecido', 'no_scheme',
      public.alarm_admit_event(v_user,'cam-a','tampering',v_in,0) ->> 'reason'),
    ('relógio ausente é indeterminado', 'indeterminate',
      public.alarm_admit_event(v_user,'cam-a','intrusion',NULL,0) ->> 'reason'),
    ('relógio ausente não admite', 'false',
      public.alarm_admit_event(v_user,'cam-a','intrusion',NULL,0) ->> 'admitted'),
    ('fuso desloca a janela', 'admitted',
      public.alarm_admit_event(v_user,'cam-a','intrusion',v_out,-120) ->> 'reason'),
    ('origem vazia é neutra', 'no_scheme',
      public.alarm_admit_event(v_user,'','intrusion',v_in,0) ->> 'reason'),
    ('usuário nulo é neutro', 'no_scheme',
      public.alarm_admit_event(NULL,'cam-a','intrusion',v_in,0) ->> 'reason'),
    ('outro usuário não enxerga', 'no_scheme',
      public.alarm_admit_event(gen_random_uuid(),'cam-a','intrusion',v_in,0) ->> 'reason');

  UPDATE public.alarm_schemes SET enabled = false WHERE id = v_id;
  INSERT INTO _adm VALUES
    ('desabilitado', 'disabled',
      public.alarm_admit_event(v_user,'cam-a','intrusion',v_in,0) ->> 'reason');

  UPDATE public.alarm_schemes
     SET enabled = true, source_ids = ARRAY['cam-a','cam-b'],
         missing_source_ids = ARRAY['cam-a']
   WHERE id = v_id;
  INSERT INTO _adm VALUES
    ('origem ausente não escuta', 'source_missing',
      public.alarm_admit_event(v_user,'cam-a','intrusion',v_in,0) ->> 'reason'),
    ('irmã presente segue com ressalva', 'admitted_degraded',
      public.alarm_admit_event(v_user,'cam-b','intrusion',v_in,0) ->> 'reason');

  UPDATE public.alarm_schemes
     SET missing_source_ids = ARRAY['cam-a','cam-b'] WHERE id = v_id;
  INSERT INTO _adm VALUES
    ('sem origem efetiva é inoperante', 'source_missing',
      public.alarm_admit_event(v_user,'cam-b','intrusion',v_in,0) ->> 'reason');

  DELETE FROM public.alarm_schemes WHERE id = v_id;

  RETURN QUERY
    SELECT a.case_name, a.expected, a.actual, a.actual IS NOT DISTINCT FROM a.expected FROM _adm a;
END;
$$;

REVOKE ALL ON FUNCTION public.alarm_admission_selftest() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.alarm_admission_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.alarm_admission_selftest() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.alarm_admission_selftest() TO service_role;

COMMENT ON FUNCTION public.alarm_admission_selftest()
  IS 'Onda 226: exercício dinâmico da admissão com linhas reais criadas e removidas.';