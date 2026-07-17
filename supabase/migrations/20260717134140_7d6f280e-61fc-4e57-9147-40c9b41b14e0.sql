
CREATE OR REPLACE FUNCTION public.get_missing_fk_indexes()
RETURNS TABLE(
  schema_name text,
  table_name text,
  constraint_name text,
  fk_columns text,
  referenced_table text,
  table_size_bytes bigint,
  table_size_pretty text,
  suggested_index text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH fk_cols AS (
    SELECT
      n.nspname            AS schema_name,
      c.relname            AS table_name,
      con.conname          AS constraint_name,
      con.conrelid         AS table_oid,
      con.conkey           AS col_nums,
      cf.relname           AS referenced_table,
      (SELECT string_agg(att.attname, ',' ORDER BY u.ord)
         FROM unnest(con.conkey) WITH ORDINALITY AS u(attnum, ord)
         JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = u.attnum
      )                    AS fk_columns
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_class cf ON cf.oid = con.confrelid
    WHERE con.contype = 'f'
      AND n.nspname = 'public'
  )
  SELECT
    f.schema_name::text,
    f.table_name::text,
    f.constraint_name::text,
    f.fk_columns::text,
    f.referenced_table::text,
    pg_relation_size(f.table_oid)::bigint AS table_size_bytes,
    pg_size_pretty(pg_relation_size(f.table_oid))::text AS table_size_pretty,
    format('CREATE INDEX idx_%s_%s ON public.%I (%s);',
           f.table_name,
           replace(f.fk_columns, ',', '_'),
           f.table_name,
           f.fk_columns)::text AS suggested_index
  FROM fk_cols f
  WHERE NOT EXISTS (
    SELECT 1
    FROM pg_index i
    WHERE i.indrelid = f.table_oid
      AND (i.indkey::int2[])[0:array_length(f.col_nums, 1) - 1] = f.col_nums
  )
    AND pg_relation_size(f.table_oid) >= (256 * 1024)
  ORDER BY pg_relation_size(f.table_oid) DESC
  LIMIT 100;
END;
$$;

REVOKE ALL ON FUNCTION public.get_missing_fk_indexes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_missing_fk_indexes() TO authenticated, service_role;
