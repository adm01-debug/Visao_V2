-- ============================================================================
-- Onda 156 — persistência da exportação probatória (cadeia de custódia)
--
-- Princípio: o manifesto selado é DOCUMENTO DE REGISTRO. Uma vez gravado, não
-- se corrige — corrigir prova é adulterar prova. Erro se resolve emitindo nova
-- exportação, nunca editando a anterior.
--
-- O banco não confia nas colunas de resumo enviadas pelo cliente: ele as deriva
-- do próprio manifesto. Caso contrário a linha poderia dizer "admissível"
-- enquanto o documento diz "sem valor probatório", e é a linha que aparece na
-- listagem.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Canonicalização de um segmento — espelho EXATO de `segmentPayload()` em
-- src/lib/evidence/custodyManifest.ts: chaves em ordem alfabética, sem espaços.
-- Divergir de um único byte aqui invalidaria toda exportação legítima, por isso
-- o gate de CI compara os dois lados com um vetor conhecido.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evidence_canonical_segment(p_segment jsonb)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  k text;
  v jsonb;
BEGIN
  IF p_segment IS NULL OR jsonb_typeof(p_segment) <> 'object' THEN
    RAISE EXCEPTION 'segmento não é objeto';
  END IF;

  -- Números precisam ser inteiros: byte, milissegundo e índice são contagens.
  -- Fracionário abriria divergência de formatação entre JS e Postgres (1e-7,
  -- 0.30000000000000004) e o selo deixaria de ser reproduzível.
  FOREACH k IN ARRAY ARRAY['byteSize', 'clockOffsetMs', 'index'] LOOP
    v := p_segment -> k;
    IF v IS NULL OR jsonb_typeof(v) <> 'number' THEN
      RAISE EXCEPTION 'segmento sem campo numérico %', k;
    END IF;
    IF (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric) THEN
      RAISE EXCEPTION 'campo % não é inteiro (%)', k, v #>> '{}';
    END IF;
  END LOOP;

  FOREACH k IN ARRAY ARRAY['deviceEndUtc', 'deviceStartUtc', 'receivedAtUtc', 'sha256', 'storagePath'] LOOP
    IF jsonb_typeof(p_segment -> k) IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'segmento sem campo textual %', k;
    END IF;
  END LOOP;

  RETURN '{'
    || '"byteSize":'       || (p_segment ->> 'byteSize')::bigint
    || ',"clockOffsetMs":' || (p_segment ->> 'clockOffsetMs')::bigint
    || ',"deviceEndUtc":'    || to_json(p_segment ->> 'deviceEndUtc')::text
    || ',"deviceStartUtc":'  || to_json(p_segment ->> 'deviceStartUtc')::text
    || ',"index":'         || (p_segment ->> 'index')::bigint
    || ',"receivedAtUtc":'   || to_json(p_segment ->> 'receivedAtUtc')::text
    || ',"sha256":'          || to_json(p_segment ->> 'sha256')::text
    || ',"storagePath":'     || to_json(p_segment ->> 'storagePath')::text
    || '}';
END;
$$;

-- ---------------------------------------------------------------------------
-- Recalcula a corrente: chain[i] = SHA256(chain[i-1] || E'\n' || canon(seg[i])).
-- Verificação INDEPENDENTE: impede colar uma corrente legítima de outra
-- exportação sobre um conjunto de trechos trocado.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evidence_chain(p_segments jsonb)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  genesis  CONSTANT text := 'visao:custody:v1:0000000000000000000000000000000000000000000000000000000000000000';
  previous text := genesis;
  seg      jsonb;
  out      text[] := ARRAY[]::text[];
BEGIN
  IF p_segments IS NULL OR jsonb_typeof(p_segments) <> 'array' THEN
    RAISE EXCEPTION 'segments não é lista';
  END IF;

  FOR seg IN SELECT * FROM jsonb_array_elements(p_segments) LOOP
    previous := encode(
      digest(previous || E'\n' || public.evidence_canonical_segment(seg), 'sha256'),
      'hex'
    );
    out := out || previous;
  END LOOP;

  RETURN out;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tabela
-- ---------------------------------------------------------------------------
CREATE TABLE public.evidence_exports (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL DEFAULT auth.uid(),
  -- Sem chave estrangeira para `cameras` de propósito: a prova sobrevive ao
  -- descadastro do equipamento. FK com RESTRICT travaria a limpeza da frota;
  -- com CASCADE apagaria a prova junto — os dois são inaceitáveis.
  camera_id      uuid NOT NULL,
  export_id      text NOT NULL UNIQUE,
  root_hash      text NOT NULL,
  verdict        text NOT NULL,
  coverage_ratio numeric(9,6) NOT NULL,
  segment_count  integer NOT NULL,
  gap_count      integer NOT NULL,
  manifest       jsonb NOT NULL,
  sealed_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT evidence_exports_root_hash_hex CHECK (root_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT evidence_exports_verdict_valid CHECK (verdict IN ('admissible', 'weakened', 'broken')),
  CONSTRAINT evidence_exports_coverage_range CHECK (coverage_ratio >= 0 AND coverage_ratio <= 1),
  CONSTRAINT evidence_exports_counts_nonneg CHECK (segment_count >= 0 AND gap_count >= 0)
);

CREATE INDEX evidence_exports_user_sealed_idx ON public.evidence_exports (user_id, sealed_at DESC);
CREATE INDEX evidence_exports_camera_idx      ON public.evidence_exports (camera_id, sealed_at DESC);
CREATE INDEX evidence_exports_verdict_idx     ON public.evidence_exports (verdict) WHERE verdict <> 'admissible';

COMMENT ON TABLE public.evidence_exports IS
  'Manifestos selados de exportação probatória. Imutáveis por decisão: prova corrigida é prova adulterada.';

-- ---------------------------------------------------------------------------
-- Selagem: valida o manifesto e DERIVA as colunas de resumo dele.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evidence_exports_seal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  m           jsonb := NEW.manifest;
  segs        jsonb;
  recomputed  text[];
  declared    text[];
  i           integer;
BEGIN
  IF jsonb_typeof(m) <> 'object' THEN
    RAISE EXCEPTION 'manifesto ausente ou malformado';
  END IF;

  IF (m ->> 'version') IS DISTINCT FROM '1' THEN
    RAISE EXCEPTION 'versão de manifesto não suportada: %', m ->> 'version';
  END IF;

  IF coalesce(m ->> 'rootHash', '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'selo (rootHash) ausente ou fora do formato';
  END IF;

  IF coalesce(btrim(m ->> 'requestedBy'), '') = '' THEN
    RAISE EXCEPTION 'exportação sem autor não pode ser selada';
  END IF;

  IF coalesce(m ->> 'exportId', '') = '' THEN
    RAISE EXCEPTION 'manifesto sem exportId';
  END IF;

  IF (m -> 'assessment' ->> 'level') NOT IN ('admissible', 'weakened', 'broken') THEN
    RAISE EXCEPTION 'veredito ausente ou desconhecido no manifesto';
  END IF;

  segs := coalesce(m -> 'segments', '[]'::jsonb);
  IF jsonb_typeof(segs) <> 'array' THEN
    RAISE EXCEPTION 'segments não é lista';
  END IF;

  -- Corrente: recalculada aqui, nunca aceita como está.
  recomputed := public.evidence_chain(segs);
  SELECT coalesce(array_agg(value #>> '{}' ORDER BY ordinality), ARRAY[]::text[])
    INTO declared
    FROM jsonb_array_elements(coalesce(m -> 'chain', '[]'::jsonb)) WITH ORDINALITY;

  IF coalesce(array_length(declared, 1), 0) <> coalesce(array_length(recomputed, 1), 0) THEN
    RAISE EXCEPTION 'corrente tem % elo(s) para % segmento(s)',
      coalesce(array_length(declared, 1), 0), coalesce(array_length(recomputed, 1), 0);
  END IF;

  -- Reporta só o PRIMEIRO elo divergente: os seguintes são consequência
  -- aritmética do encadeamento, não pistas independentes.
  FOR i IN 1 .. coalesce(array_length(recomputed, 1), 0) LOOP
    IF declared[i] IS DISTINCT FROM recomputed[i] THEN
      RAISE EXCEPTION 'corrente não confere a partir do segmento % (elo declarado % ≠ recalculado %)',
        i - 1, left(declared[i], 12), left(recomputed[i], 12);
    END IF;
  END LOOP;

  -- Atribuição: ninguém sela prova em nome de outra pessoa. auth.uid() é nulo
  -- para service_role (borda), que já responde pela própria autenticação.
  IF auth.uid() IS NOT NULL THEN
    NEW.user_id := auth.uid();
    IF (m ->> 'requestedBy') IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'autor do manifesto (%) difere do usuário autenticado', m ->> 'requestedBy';
    END IF;
  END IF;

  NEW.export_id      := m ->> 'exportId';
  NEW.root_hash      := m ->> 'rootHash';
  NEW.verdict        := m -> 'assessment' ->> 'level';
  NEW.coverage_ratio := round(coalesce((m -> 'assessment' ->> 'coverageRatio')::numeric, 0), 6);
  NEW.segment_count  := jsonb_array_length(segs);
  NEW.gap_count      := jsonb_array_length(coalesce(m -> 'assessment' -> 'gaps', '[]'::jsonb));
  NEW.sealed_at      := now();

  RETURN NEW;
END;
$$;

CREATE TRIGGER evidence_exports_seal_before_insert
  BEFORE INSERT ON public.evidence_exports
  FOR EACH ROW EXECUTE FUNCTION public.evidence_exports_seal();

-- Imutabilidade em nível de tabela: a ausência de policy já barra o cliente,
-- mas o gatilho barra também service_role, cron e qualquer rotina interna.
CREATE OR REPLACE FUNCTION public.block_evidence_export_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'evidence_exports é imutável: emita nova exportação em vez de editar (%).', TG_OP;
END;
$$;

CREATE TRIGGER evidence_exports_no_update
  BEFORE UPDATE OR DELETE ON public.evidence_exports
  FOR EACH ROW EXECUTE FUNCTION public.block_evidence_export_mutation();

-- ---------------------------------------------------------------------------
-- Privilégios e RLS
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.evidence_exports FROM anon;
GRANT SELECT, INSERT ON public.evidence_exports TO authenticated;
GRANT ALL ON public.evidence_exports TO service_role;

ALTER TABLE public.evidence_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "evidence_exports_select_own_or_admin"
  ON public.evidence_exports FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "evidence_exports_insert_own"
  ON public.evidence_exports FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Sem policy de UPDATE/DELETE: nem o dono, nem admin.