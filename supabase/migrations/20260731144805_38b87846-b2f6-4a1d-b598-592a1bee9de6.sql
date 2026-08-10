CREATE OR REPLACE FUNCTION public._migrate_read_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $fn$
DECLARE
  v_trimmed text := btrim(coalesce(query, ''));
  v_upper   text := upper(v_trimmed);
  v_result  jsonb;
BEGIN
  -- Só permite SELECT ou WITH
  IF v_upper NOT LIKE 'SELECT%' AND v_upper NOT LIKE 'WITH %' AND v_upper NOT LIKE 'WITH(%' THEN
    RAISE EXCEPTION 'read_only_violation: only SELECT/WITH allowed' USING ERRCODE = '42501';
  END IF;
  -- Rejeita múltiplos statements
  IF v_trimmed ~ ';\s*\S' THEN
    RAISE EXCEPTION 'multi_statement_not_allowed' USING ERRCODE = '42501';
  END IF;
  EXECUTE 'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM (' || v_trimmed || ') AS t'
    INTO v_result;
  RETURN v_result;
END;
$fn$;

REVOKE ALL ON FUNCTION public._migrate_read_sql(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public._migrate_read_sql(text) TO service_role;

COMMENT ON FUNCTION public._migrate_read_sql(text) IS 'TEMPORÁRIA — usada pelo migrate-helper para migração de dados. Remover após concluir a migração.';