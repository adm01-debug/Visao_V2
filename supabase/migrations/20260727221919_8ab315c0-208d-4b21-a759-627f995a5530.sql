-- Defeito encontrado no exercício dinâmico: o gatilho é SECURITY INVOKER e
-- chamava `auth.uid()`, que exige USAGE no schema `auth`. Papéis internos não
-- têm — e a selagem abortava com "permission denied" em vez de gravar.
CREATE OR REPLACE FUNCTION public.evidence_current_subject()
RETURNS uuid
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid;
$$;

REVOKE ALL ON FUNCTION public.evidence_current_subject() FROM anon;

ALTER TABLE public.evidence_exports ALTER COLUMN user_id DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.evidence_exports_seal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  m          jsonb := NEW.manifest;
  segs       jsonb;
  recomputed text[];
  declared   text[];
  subject    uuid := public.evidence_current_subject();
  i          integer;
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

  recomputed := public.evidence_chain(segs);
  SELECT coalesce(array_agg(value #>> '{}' ORDER BY ordinality), ARRAY[]::text[])
    INTO declared
    FROM jsonb_array_elements(coalesce(m -> 'chain', '[]'::jsonb)) WITH ORDINALITY;

  IF coalesce(array_length(declared, 1), 0) <> coalesce(array_length(recomputed, 1), 0) THEN
    RAISE EXCEPTION 'corrente tem % elo(s) para % segmento(s)',
      coalesce(array_length(declared, 1), 0), coalesce(array_length(recomputed, 1), 0);
  END IF;

  FOR i IN 1 .. coalesce(array_length(recomputed, 1), 0) LOOP
    IF declared[i] IS DISTINCT FROM recomputed[i] THEN
      RAISE EXCEPTION 'corrente não confere a partir do segmento % (elo declarado % ≠ recalculado %)',
        i - 1, left(declared[i], 12), left(recomputed[i], 12);
    END IF;
  END LOOP;

  IF subject IS NOT NULL THEN
    NEW.user_id := subject;
    IF (m ->> 'requestedBy') IS DISTINCT FROM subject::text THEN
      RAISE EXCEPTION 'autor do manifesto (%) difere do usuário autenticado', m ->> 'requestedBy';
    END IF;
  ELSIF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'exportação precisa de dono';
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