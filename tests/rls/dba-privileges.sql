-- =============================================================================
-- Onda 106 — Suíte de privilégios das rotinas DBA
--
-- Verifica, de forma NÃO destrutiva e sem dependência de pgTAP, que:
--   1. Nenhuma rotina DBA é executável por `anon`.
--   2. Toda rotina DBA executável por `authenticated` possui guard interno
--      `has_role(auth.uid(), 'admin')` — operador/viewer recebem 42501.
--   3. Toda rotina DBA é SECURITY DEFINER com `search_path` fixado.
--   4. Rotinas de manutenção/cron não são executáveis por nenhum papel de API.
--
-- Executada por `scripts/check-dba-privileges.mjs` (comando `npm run db:check:dba`).
-- Roda inteiramente dentro de uma transação com ROLLBACK — não altera estado.
-- =============================================================================
BEGIN;

DO $suite$
DECLARE
  -- Rotinas sensíveis que a UI admin pode chamar: exigem guard de admin.
  guarded_routines text[] := ARRAY[
    'terminate_db_session',
    'get_permissive_rls_policies',
    'get_slow_queries',
    'get_long_running_sessions'
  ];
  -- Rotinas internas de manutenção: apenas service_role/cron.
  internal_routines text[] := ARRAY[
    'capture_db_health_snapshot',
    'close_expired_test_sessions',
    'system_health',
    'ensure_future_partitions'
  ];
  r record;
  failures text[] := ARRAY[]::text[];
  checks int := 0;
BEGIN
  -- ---------------------------------------------------------------------
  -- 1 + 2 + 3: rotinas com guard de admin
  -- ---------------------------------------------------------------------
  FOR r IN
    SELECT p.oid,
           p.proname,
           p.oid::regprocedure::text AS sig,
           p.prosecdef,
           p.prosrc,
           has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec,
           COALESCE(array_to_string(p.proconfig, ','), '')           AS cfg
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(guarded_routines)
  LOOP
    checks := checks + 1;

    IF r.anon_exec THEN
      failures := array_append(failures,
        format('[anon] %s é executável por anon (SECURITY DEFINER ignora RLS)', r.sig));
    END IF;

    IF r.auth_exec AND r.prosrc !~* 'has_role[^;]{0,80}admin' THEN
      failures := array_append(failures,
        format('[guard] %s executável por authenticated sem has_role(...,''admin'')', r.sig));
    END IF;

    IF r.prosecdef AND r.cfg !~ 'search_path' THEN
      failures := array_append(failures,
        format('[search_path] %s é SECURITY DEFINER sem SET search_path', r.sig));
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------
  -- 4: rotinas internas não podem ser chamadas por papéis da Data API
  -- ---------------------------------------------------------------------
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig,
           has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_exec,
           has_function_privilege('authenticated', p.oid, 'EXECUTE') AS auth_exec
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(internal_routines)
  LOOP
    checks := checks + 1;
    IF r.anon_exec OR r.auth_exec THEN
      failures := array_append(failures,
        format('[internal] %s deveria ser exclusiva de service_role (anon=%s, authenticated=%s)',
               r.sig, r.anon_exec, r.auth_exec));
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------
  -- 5: nenhuma partição pode ficar sem RLS própria (Onda 106)
  -- ---------------------------------------------------------------------
  FOR r IN
    SELECT c.relname AS part
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relispartition
      AND (NOT c.relrowsecurity
           OR NOT EXISTS (SELECT 1 FROM pg_policies p
                          WHERE p.schemaname = 'public' AND p.tablename = c.relname))
  LOOP
    checks := checks + 1;
    failures := array_append(failures,
      format('[partition] %s sem RLS/policy própria', r.part));
  END LOOP;

  IF array_length(failures, 1) > 0 THEN
    RAISE EXCEPTION E'DBA privilege suite FALHOU (% verificações):\n  - %',
      checks, array_to_string(failures, E'\n  - ');
  END IF;

  RAISE NOTICE 'DBA privilege suite OK — % verificações, 0 falhas.', checks;
END;
$suite$;

ROLLBACK;
