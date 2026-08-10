DROP FUNCTION IF EXISTS public.get_duplicate_indexes();

CREATE OR REPLACE FUNCTION public.get_duplicate_indexes()
RETURNS TABLE(
  schema_name text,
  table_name text,
  index_a text,
  index_b text,
  size_a_pretty text,
  size_b_pretty text,
  relation text,
  a_is_unique boolean,
  b_is_unique boolean,
  suggestion text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'access denied: admin role required';
  END IF;

  RETURN QUERY
  WITH idx AS (
    SELECT
      n.nspname::text  AS schema_name,
      c.relname::text  AS table_name,
      i.relname::text  AS index_name,
      x.indexrelid     AS oid,
      x.indkey::int[]  AS keys,
      x.indisunique    AS is_unique,
      x.indpred IS NOT NULL AS has_pred,
      am.amname::text  AS method,
      pg_relation_size(x.indexrelid)::bigint AS size_bytes
    FROM pg_index x
    JOIN pg_class i  ON i.oid = x.indexrelid
    JOIN pg_class c  ON c.oid = x.indrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_am am ON am.oid = i.relam
    WHERE n.nspname = 'public'
      AND NOT x.indisprimary
  ),
  pairs AS (
    SELECT
      a.schema_name,
      a.table_name,
      a.index_name AS index_a,
      b.index_name AS index_b,
      a.size_bytes AS size_a,
      b.size_bytes AS size_b,
      a.is_unique  AS a_is_unique,
      b.is_unique  AS b_is_unique,
      a.keys       AS keys_a,
      b.keys       AS keys_b,
      a.method     AS method_a,
      b.method     AS method_b,
      a.has_pred OR b.has_pred AS any_predicate
    FROM idx a
    JOIN idx b
      ON a.schema_name = b.schema_name
     AND a.table_name  = b.table_name
     AND a.oid < b.oid
     AND a.method = b.method
  )
  SELECT
    p.schema_name,
    p.table_name,
    p.index_a,
    p.index_b,
    pg_size_pretty(p.size_a) AS size_a_pretty,
    pg_size_pretty(p.size_b) AS size_b_pretty,
    CASE
      WHEN p.keys_a = p.keys_b THEN 'identical'
      ELSE 'prefix'
    END::text AS relation,
    p.a_is_unique,
    p.b_is_unique,
    CASE
      WHEN p.any_predicate THEN
        format('-- ambos têm predicado, avaliar manualmente: %I vs %I', p.index_a, p.index_b)
      WHEN p.keys_a = p.keys_b AND p.a_is_unique AND NOT p.b_is_unique THEN
        format('DROP INDEX IF EXISTS %I.%I;', p.schema_name, p.index_b)
      WHEN p.keys_a = p.keys_b AND p.b_is_unique AND NOT p.a_is_unique THEN
        format('DROP INDEX IF EXISTS %I.%I;', p.schema_name, p.index_a)
      WHEN p.keys_a = p.keys_b THEN
        format('DROP INDEX IF EXISTS %I.%I;', p.schema_name,
               CASE WHEN p.size_a >= p.size_b THEN p.index_a ELSE p.index_b END)
      WHEN p.keys_a @> p.keys_b AND NOT p.b_is_unique THEN
        format('DROP INDEX IF EXISTS %I.%I;', p.schema_name, p.index_b)
      WHEN p.keys_b @> p.keys_a AND NOT p.a_is_unique THEN
        format('DROP INDEX IF EXISTS %I.%I;', p.schema_name, p.index_a)
      ELSE
        format('-- revisar: %I e %I compartilham prefixo', p.index_a, p.index_b)
    END::text AS suggestion
  FROM pairs p
  WHERE p.keys_a = p.keys_b
     OR p.keys_a @> p.keys_b
     OR p.keys_b @> p.keys_a
  ORDER BY p.table_name, p.index_a;
END;
$$;

REVOKE ALL ON FUNCTION public.get_duplicate_indexes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_duplicate_indexes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_duplicate_indexes() TO service_role;

COMMENT ON FUNCTION public.get_duplicate_indexes() IS
'Onda 97 — Detecta índices idênticos ou com prefixo redundante no schema public. Restrito a admins.';