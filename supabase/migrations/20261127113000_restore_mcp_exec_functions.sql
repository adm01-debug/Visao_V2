-- ROLLBACK:
--   DROP FUNCTION IF EXISTS public.mcp_exec_many(text[], integer);
--   DROP FUNCTION IF EXISTS public.mcp_exec(text, integer);
--   Reverter remove as funcoes do MCP; o servidor MCP volta a falhar em
--   `exec_sql` com 400. So use se precisar desligar o acesso de escrita via MCP.

-- As funcoes de `exec_sql` do MCP estavam declaradas em `20260901113134` mas
-- NAO existiam em producao: `select 1` respondia 503 e toda escrita pelo MCP
-- falhava. Detectado pelo `db:check:drift`, que compara o historico com o banco.
-- Recriadas aqui para que um `db reset` reproduza o estado real.
BEGIN;

CREATE OR REPLACE FUNCTION public.mcp_exec(sql text, max_rows integer DEFAULT 200)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  q text := regexp_replace(sql, '[;\s]+$', '');
  lim int := greatest(coalesce(max_rows, 200), 0);
  rec record; rows jsonb := '[]'::jsonb; n int := 0; affected bigint;
  t0 timestamptz := clock_timestamp();
begin
  begin
    for rec in execute q loop
      n := n + 1;
      if n <= lim then rows := rows || to_jsonb(rec); end if;
    end loop;
    return jsonb_build_object('rows', rows, 'row_count', n, 'truncated', n > lim, 'ms', round(extract(epoch from clock_timestamp()-t0)*1000));
  exception
    when query_canceled or lock_not_available then raise;
    when others then null;
  end;
  execute q;
  get diagnostics affected = row_count;
  return jsonb_build_object('ok', true, 'rows_affected', affected, 'ms', round(extract(epoch from clock_timestamp()-t0)*1000));
end
$function$;

CREATE OR REPLACE FUNCTION public.mcp_exec_many(statements text[], max_rows integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
declare
  i int; n int := coalesce(array_length(statements, 1), 0);
  res jsonb := '[]'::jsonb;
  t0 timestamptz := clock_timestamp();
begin
  for i in 1 .. n loop
    res := res || jsonb_build_object('i', i, 'sql', left(statements[i], 200), 'result', public.mcp_exec(statements[i], max_rows));
  end loop;
  return jsonb_build_object('ok', true, 'count', n, 'results', res, 'ms', round(extract(epoch from clock_timestamp()-t0)*1000));
end
$function$;

REVOKE EXECUTE ON FUNCTION public.mcp_exec(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mcp_exec_many(text[], integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mcp_exec(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.mcp_exec_many(text[], integer) TO service_role;

COMMIT;
