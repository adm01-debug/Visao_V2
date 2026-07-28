-- Onda 228 — Persistência do livro de admissão (janelas fechadas)
-- Espelho SQL da invariante L1 (contabilidade fechada) e L6 (cobertura).

CREATE TABLE IF NOT EXISTS public.admission_ledger_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  total integer NOT NULL,
  admitted integer NOT NULL,
  dropped_out_of_window integer NOT NULL DEFAULT 0,
  first_at timestamptz,
  last_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT admission_window_order CHECK (window_end > window_start),
  CONSTRAINT admission_nonnegative CHECK (
    total >= 0 AND admitted >= 0 AND dropped_out_of_window >= 0 AND admitted <= total
  ),
  CONSTRAINT admission_source_not_blank CHECK (btrim(source_id) <> ''),
  -- L4: evento sem relógio não data; bordas existem juntas ou não existem.
  CONSTRAINT admission_edges_paired CHECK (
    (first_at IS NULL AND last_at IS NULL) OR (first_at IS NOT NULL AND last_at IS NOT NULL AND first_at <= last_at)
  ),
  -- L3: uma borda datada jamais pode cair fora da janela declarada.
  CONSTRAINT admission_edges_in_window CHECK (
    first_at IS NULL OR (first_at >= window_start AND last_at <= window_end)
  ),
  CONSTRAINT admission_window_unique UNIQUE (user_id, source_id, window_start)
);

COMMENT ON TABLE public.admission_ledger_windows IS
  'Onda 227/228 — livro-caixa das decisões de admissão por origem e janela. Append-only.';

-- Espelho da lei L1: os oito baldes conhecidos somam exatamente `total`,
-- e `admitted` é exatamente a soma dos dois baldes de admissão.
CREATE OR REPLACE FUNCTION public.admission_counts_sum(p_counts jsonb)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT sum(COALESCE((p_counts ->> k)::integer, 0))::integer
     FROM unnest(ARRAY[
       'admitted','admitted_degraded','indeterminate','out_of_window',
       'inoperative','disabled','source_missing','no_scheme'
     ]) AS k),
    0);
$$;

CREATE OR REPLACE FUNCTION public.admission_counts_valid(p_counts jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_typeof(p_counts) = 'object'
     -- nenhuma chave desconhecida: balde inventado corrompe a auditoria
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_counts) AS k
       WHERE k NOT IN ('admitted','admitted_degraded','indeterminate','out_of_window',
                       'inoperative','disabled','source_missing','no_scheme')
     )
     -- todo valor é inteiro não negativo
     AND NOT EXISTS (
       SELECT 1 FROM jsonb_each(p_counts) AS e(k, v)
       WHERE jsonb_typeof(v) <> 'number'
          OR (v #>> '{}') !~ '^[0-9]+$'
     );
$$;

ALTER TABLE public.admission_ledger_windows
  ADD CONSTRAINT admission_counts_shape CHECK (public.admission_counts_valid(counts)),
  ADD CONSTRAINT admission_counts_closed CHECK (public.admission_counts_sum(counts) = total),
  ADD CONSTRAINT admission_admitted_mirror CHECK (
    COALESCE((counts ->> 'admitted')::integer, 0)
    + COALESCE((counts ->> 'admitted_degraded')::integer, 0) = admitted
  );

CREATE INDEX IF NOT EXISTS idx_admission_ledger_user_window
  ON public.admission_ledger_windows (user_id, window_start DESC);
CREATE INDEX IF NOT EXISTS idx_admission_ledger_source
  ON public.admission_ledger_windows (user_id, source_id, window_start DESC);

-- Append-only: corrigir história de auditoria é adulterar prova.
CREATE OR REPLACE FUNCTION public.block_admission_ledger_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'admission_ledger_immutable: o livro de admissão é append-only';
END;
$$;

DROP TRIGGER IF EXISTS admission_ledger_immutable ON public.admission_ledger_windows;
CREATE TRIGGER admission_ledger_immutable
  BEFORE UPDATE OR DELETE ON public.admission_ledger_windows
  FOR EACH ROW EXECUTE FUNCTION public.block_admission_ledger_mutation();

REVOKE ALL ON public.admission_ledger_windows FROM anon, authenticated, PUBLIC;
GRANT SELECT, INSERT ON public.admission_ledger_windows TO authenticated;
GRANT ALL ON public.admission_ledger_windows TO service_role;

ALTER TABLE public.admission_ledger_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admission_ledger_select_own" ON public.admission_ledger_windows;
CREATE POLICY "admission_ledger_select_own" ON public.admission_ledger_windows
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admission_ledger_insert_own" ON public.admission_ledger_windows;
CREATE POLICY "admission_ledger_insert_own" ON public.admission_ledger_windows
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- L6 — veredito de cobertura calculado no banco, mesma régua do TypeScript.
CREATE OR REPLACE FUNCTION public.admission_coverage(
  p_user_id uuid,
  p_source_ids text[],
  p_window_start timestamptz
)
RETURNS TABLE (source_id text, status text, dominant_reason text, total integer, admitted integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH universe AS (
    SELECT DISTINCT btrim(s) AS source_id
    FROM unnest(COALESCE(p_source_ids, ARRAY[]::text[])) AS s
    WHERE btrim(s) <> ''
    UNION
    SELECT w.source_id
    FROM public.admission_ledger_windows w
    WHERE w.user_id = p_user_id AND w.window_start >= p_window_start
  ),
  agg AS (
    SELECT u.source_id,
           COALESCE(sum(w.total), 0)::integer AS total,
           COALESCE(sum(w.admitted), 0)::integer AS admitted,
           COALESCE(jsonb_object_agg(k.key, k.total) FILTER (WHERE k.key IS NOT NULL), '{}'::jsonb) AS counts
    FROM universe u
    LEFT JOIN public.admission_ledger_windows w
      ON w.user_id = p_user_id AND w.source_id = u.source_id AND w.window_start >= p_window_start
    LEFT JOIN LATERAL (
      SELECT e.key, sum((e.value #>> '{}')::integer) AS total
      FROM jsonb_each(w.counts) AS e
      GROUP BY e.key
    ) k ON true
    GROUP BY u.source_id
  )
  SELECT a.source_id,
         CASE WHEN a.total = 0 THEN 'no_data'
              WHEN a.admitted > 0 THEN 'covered'
              ELSE 'gap' END AS status,
         CASE WHEN a.total = 0 OR a.admitted > 0 THEN NULL
              ELSE (SELECT e.key FROM jsonb_each(a.counts) AS e
                    WHERE (e.value #>> '{}')::integer > 0
                    ORDER BY (e.value #>> '{}')::integer DESC,
                             array_position(ARRAY['admitted','admitted_degraded','indeterminate',
                                                  'out_of_window','inoperative','disabled',
                                                  'source_missing','no_scheme'], e.key)
                    LIMIT 1) END AS dominant_reason,
         a.total,
         a.admitted
  FROM agg a
  ORDER BY a.source_id;
$$;

REVOKE ALL ON FUNCTION public.admission_coverage(uuid, text[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admission_coverage(uuid, text[], timestamptz) TO service_role;

-- Autoteste dinâmico: cria, viola cada guarda e desfaz tudo.
CREATE OR REPLACE FUNCTION public.admission_ledger_selftest()
RETURNS TABLE (name text, ok boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := gen_random_uuid();
  v_ws timestamptz := timestamptz '2026-07-27 00:00:00+00';
  v_we timestamptz := timestamptz '2026-07-27 01:00:00+00';
  v_id uuid;
  v_err text;
BEGIN
  -- 1) linha válida entra
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted, first_at, last_at)
    VALUES (v_user, 'cam-1', v_ws, v_we,
            '{"admitted":2,"out_of_window":1}'::jsonb, 3, 2, v_ws, v_we)
    RETURNING id INTO v_id;
    RETURN QUERY SELECT 'linha válida aceita', true, ''::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'linha válida aceita', false, SQLERRM;
  END;

  -- 2) contabilidade aberta é recusada (L1)
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, 'cam-2', v_ws, v_we, '{"admitted":2}'::jsonb, 3, 2);
    RETURN QUERY SELECT 'L1 soma dos baldes = total', false, 'aceitou livro aberto';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'L1 soma dos baldes = total', true, ''::text;
  END;

  -- 3) admitted precisa espelhar os dois baldes de admissão
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, 'cam-3', v_ws, v_we, '{"admitted":1,"no_scheme":1}'::jsonb, 2, 2);
    RETURN QUERY SELECT 'L2 admitted espelha os baldes', false, 'aceitou divergência';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'L2 admitted espelha os baldes', true, ''::text;
  END;

  -- 4) balde inventado é recusado
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, 'cam-4', v_ws, v_we, '{"inventado":1}'::jsonb, 1, 0);
    RETURN QUERY SELECT 'balde desconhecido recusado', false, 'aceitou balde inventado';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'balde desconhecido recusado', true, ''::text;
  END;

  -- 5) contagem negativa é recusada
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, 'cam-5', v_ws, v_we, '{"no_scheme":-1}'::jsonb, -1, 0);
    RETURN QUERY SELECT 'contagem negativa recusada', false, 'aceitou negativo';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'contagem negativa recusada', true, ''::text;
  END;

  -- 6) borda fora da janela é recusada (L3)
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted, first_at, last_at)
    VALUES (v_user, 'cam-6', v_ws, v_we, '{"admitted":1}'::jsonb, 1, 1,
            v_ws - interval '1 minute', v_we);
    RETURN QUERY SELECT 'L3 borda fora da janela recusada', false, 'aceitou borda fora';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'L3 borda fora da janela recusada', true, ''::text;
  END;

  -- 7) borda solitária é recusada (L4)
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted, first_at)
    VALUES (v_user, 'cam-7', v_ws, v_we, '{"indeterminate":1}'::jsonb, 1, 0, v_ws);
    RETURN QUERY SELECT 'L4 bordas emparelhadas', false, 'aceitou borda solitária';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'L4 bordas emparelhadas', true, ''::text;
  END;

  -- 8) janela invertida é recusada
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, 'cam-8', v_we, v_ws, '{}'::jsonb, 0, 0);
    RETURN QUERY SELECT 'janela invertida recusada', false, 'aceitou janela invertida';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'janela invertida recusada', true, ''::text;
  END;

  -- 9) origem em branco é recusada
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, '   ', v_ws, v_we, '{}'::jsonb, 0, 0);
    RETURN QUERY SELECT 'origem em branco recusada', false, 'aceitou origem vazia';
  EXCEPTION WHEN check_violation THEN
    RETURN QUERY SELECT 'origem em branco recusada', true, ''::text;
  END;

  -- 10) mesma janela duas vezes é recusada
  BEGIN
    INSERT INTO public.admission_ledger_windows
      (user_id, source_id, window_start, window_end, counts, total, admitted)
    VALUES (v_user, 'cam-1', v_ws, v_we, '{}'::jsonb, 0, 0);
    RETURN QUERY SELECT 'janela duplicada recusada', false, 'aceitou duplicata';
  EXCEPTION WHEN unique_violation THEN
    RETURN QUERY SELECT 'janela duplicada recusada', true, ''::text;
  END;

  -- 11) UPDATE é bloqueado
  BEGIN
    UPDATE public.admission_ledger_windows SET total = 99 WHERE id = v_id;
    RETURN QUERY SELECT 'append-only: UPDATE bloqueado', false, 'permitiu alteração';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    RETURN QUERY SELECT 'append-only: UPDATE bloqueado',
                        v_err LIKE 'admission_ledger_immutable%', v_err;
  END;

  -- 12) DELETE é bloqueado
  BEGIN
    DELETE FROM public.admission_ledger_windows WHERE id = v_id;
    RETURN QUERY SELECT 'append-only: DELETE bloqueado', false, 'permitiu remoção';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_err = MESSAGE_TEXT;
    RETURN QUERY SELECT 'append-only: DELETE bloqueado',
                        v_err LIKE 'admission_ledger_immutable%', v_err;
  END;

  -- 13) cobertura: origem com admissão é 'covered'
  RETURN QUERY
  SELECT 'L6 covered', c.status = 'covered', c.status
  FROM public.admission_coverage(v_user, ARRAY['cam-1'], v_ws) c WHERE c.source_id = 'cam-1';

  -- 14) cobertura: origem esperada sem evento é 'no_data', nunca coberta
  RETURN QUERY
  SELECT 'L6 no_data nunca é coberta',
         c.status = 'no_data' AND c.dominant_reason IS NULL, c.status
  FROM public.admission_coverage(v_user, ARRAY['cam-fantasma'], v_ws) c
  WHERE c.source_id = 'cam-fantasma';

  -- 15) cobertura: eventos sem admissão viram lacuna com motivo dominante
  INSERT INTO public.admission_ledger_windows
    (user_id, source_id, window_start, window_end, counts, total, admitted)
  VALUES (v_user, 'cam-gap', v_ws, v_we, '{"no_scheme":3,"disabled":1}'::jsonb, 4, 0);

  RETURN QUERY
  SELECT 'L6 gap com motivo dominante',
         c.status = 'gap' AND c.dominant_reason = 'no_scheme',
         c.status || '/' || COALESCE(c.dominant_reason, 'null')
  FROM public.admission_coverage(v_user, ARRAY[]::text[], v_ws) c WHERE c.source_id = 'cam-gap';

  -- limpeza: o autoteste não deixa rastro (service_role ignora o gatilho? não —
  -- por isso removemos as linhas desabilitando o gatilho apenas nesta sessão).
  ALTER TABLE public.admission_ledger_windows DISABLE TRIGGER admission_ledger_immutable;
  DELETE FROM public.admission_ledger_windows WHERE user_id = v_user;
  ALTER TABLE public.admission_ledger_windows ENABLE TRIGGER admission_ledger_immutable;
END;
$$;

REVOKE ALL ON FUNCTION public.admission_ledger_selftest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admission_ledger_selftest() TO service_role;