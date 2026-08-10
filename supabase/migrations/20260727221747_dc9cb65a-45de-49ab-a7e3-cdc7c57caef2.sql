-- A extensão pgcrypto vive no schema `extensions`; com `search_path = public`
-- fixo (obrigatório em rotina de segurança), `digest()` precisa ser qualificada.
-- Sem isto a selagem falhava em tempo de execução — exatamente o tipo de defeito
-- que uma migração "aplicada com sucesso" esconde.
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
      extensions.digest(previous || E'\n' || public.evidence_canonical_segment(seg), 'sha256'),
      'hex'
    );
    out := out || previous;
  END LOOP;

  RETURN out;
END;
$$;

REVOKE ALL ON FUNCTION public.evidence_chain(jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.evidence_canonical_segment(jsonb) FROM anon;