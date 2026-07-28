CREATE OR REPLACE FUNCTION public.timeline_attestation_selftest(p_document jsonb)
RETURNS TABLE (case_name text, outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := '00000000-0000-0000-0000-0000000000aa';
  v_line text;
  v_doc jsonb;
BEGIN
  -- 1. inserção legítima: as colunas de resumo têm de vir do documento,
  --    jamais dos valores absurdos que o "cliente" mandou.
  BEGIN
    INSERT INTO public.timeline_attestations
      (attestation_id, user_id, window_from, window_to, verdict, root_hash, document, issued_by,
       stays_count, confirmed_stays, cameras_visited, confirmed_dwell_ms, open_floor_ms, excluded_readings)
    VALUES (p_document->>'attestationId', v_uid, '2000-01-01', '2000-01-02', 'corroborated',
            p_document->>'rootHash', p_document, 'cliente@mentiroso', 999, 999, 999, 999, 999, 999);

    SELECT verdict || '|' || stays_count || '|' || confirmed_stays || '|' || cameras_visited
        || '|' || confirmed_dwell_ms || '|' || open_floor_ms || '|' || excluded_readings
        || '|' || issued_by
      INTO v_line
      FROM public.timeline_attestations
     WHERE attestation_id = p_document->>'attestationId';
    case_name := 'derived'; outcome := v_line; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'derived'; outcome := 'ERRO: ' || SQLERRM; RETURN NEXT;
  END;

  -- 2..6 negativos: cada violação precisa ser recusada pelo motivo certo.
  v_doc := jsonb_set(
             jsonb_set(p_document, '{verdict}', '"corroborated"'),
             '{caveats}', '[{"code":"co_presence_conflict","count":1,"detail":"x"}]');
  BEGIN
    INSERT INTO public.timeline_attestations
      (attestation_id, user_id, window_from, window_to, verdict, root_hash, document, issued_by)
    VALUES ('selftest-forjado', v_uid, '2000-01-01', '2000-01-02', 'corroborated',
            repeat('c', 64), jsonb_set(v_doc, '{rootHash}', to_jsonb(repeat('c', 64))),
            'x');
    case_name := 'forged_verdict'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'forged_verdict'; outcome := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    INSERT INTO public.timeline_attestations
      (attestation_id, user_id, window_from, window_to, verdict, root_hash, document, issued_by)
    VALUES (p_document->>'attestationId' || '-b', v_uid, '2000-01-01', '2000-01-02', 'partial',
            repeat('b', 64), p_document, 'x');
    case_name := 'seal_mismatch'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'seal_mismatch'; outcome := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    INSERT INTO public.timeline_attestations
      (attestation_id, user_id, window_from, window_to, verdict, root_hash, document, issued_by)
    VALUES ('selftest-outro-id', v_uid, '2000-01-01', '2000-01-02', 'partial',
            repeat('d', 64), jsonb_set(p_document, '{rootHash}', to_jsonb(repeat('d', 64))), 'x');
    case_name := 'id_mismatch'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'id_mismatch'; outcome := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    INSERT INTO public.timeline_attestations
      (attestation_id, user_id, window_from, window_to, verdict, root_hash, document, issued_by)
    VALUES ('selftest-resumo', v_uid, '2000-01-01', '2000-01-02', 'partial', repeat('e', 64),
            jsonb_set(jsonb_set(p_document, '{rootHash}', to_jsonb(repeat('e', 64))),
                      '{stats,stays}', '5'),
            'x');
    case_name := 'summary_mismatch'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'summary_mismatch'; outcome := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    INSERT INTO public.timeline_attestations
      (attestation_id, user_id, window_from, window_to, verdict, root_hash, document, issued_by)
    VALUES ('selftest-formato', v_uid, '2000-01-01', '2000-01-02', 'partial', repeat('f', 64),
            jsonb_set(jsonb_set(p_document, '{rootHash}', to_jsonb(repeat('f', 64))),
                      '{format}', '"qualquer.coisa"'),
            'x');
    case_name := 'unknown_format'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'unknown_format'; outcome := SQLERRM; RETURN NEXT;
  END;

  -- 7/8. imutabilidade da linha legítima.
  BEGIN
    UPDATE public.timeline_attestations SET verdict = 'corroborated'
     WHERE attestation_id = p_document->>'attestationId';
    case_name := 'update_blocked'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'update_blocked'; outcome := SQLERRM; RETURN NEXT;
  END;

  BEGIN
    DELETE FROM public.timeline_attestations
     WHERE attestation_id = p_document->>'attestationId';
    case_name := 'delete_blocked'; outcome := 'ACEITOU'; RETURN NEXT;
  EXCEPTION WHEN OTHERS THEN
    case_name := 'delete_blocked'; outcome := SQLERRM; RETURN NEXT;
  END;

  RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.timeline_attestation_selftest(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.timeline_attestation_selftest(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.timeline_attestation_selftest(jsonb) FROM authenticated;

COMMENT ON FUNCTION public.timeline_attestation_selftest(jsonb) IS
  'Onda 201: autoteste do registro de atestados. Escreve de verdade; chamar sempre dentro de BEGIN ... ROLLBACK.';