CREATE OR REPLACE FUNCTION public.healing_arbiter_invariants()
RETURNS TABLE (
  invariant_key text,
  ok boolean,
  detail text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    'observe_action_allowed'::text,
    EXISTS (
      SELECT 1 FROM pg_constraint c
       WHERE c.conname = 'agent_healing_actions_action_check'
         AND pg_get_constraintdef(c.oid) ~ 'observe'
    ),
    COALESCE(
      (SELECT pg_get_constraintdef(c.oid)
         FROM pg_constraint c
        WHERE c.conname = 'agent_healing_actions_action_check'),
      'constraint agent_healing_actions_action_check ausente'
    );

  RETURN QUERY
  SELECT
    'observe_never_carries_task'::text,
    EXISTS (
      SELECT 1 FROM pg_constraint c
       WHERE c.conname = 'agent_healing_actions_no_task_when_blocked'
         AND pg_get_constraintdef(c.oid) ~ 'observe'
    ),
    COALESCE(
      (SELECT pg_get_constraintdef(c.oid)
         FROM pg_constraint c
        WHERE c.conname = 'agent_healing_actions_no_task_when_blocked'),
      'constraint agent_healing_actions_no_task_when_blocked ausente'
    );

  RETURN QUERY
  SELECT
    'arbiter_not_client_executable'::text,
    NOT EXISTS (
      SELECT 1 FROM pg_proc p
       WHERE p.proname = 'arbitrate_agent_healing'
         AND p.pronamespace = 'public'::regnamespace
         AND (has_function_privilege('anon', p.oid, 'EXECUTE')
           OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
    ),
    (SELECT COALESCE(string_agg(
              p.oid::regprocedure::text || ' → ' ||
              CASE WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 'anon ' ELSE '' END ||
              CASE WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 'authenticated' ELSE '' END,
              '; '),
            'nenhuma sobrecarga exposta a anon/authenticated')
       FROM pg_proc p
      WHERE p.proname = 'arbitrate_agent_healing'
        AND p.pronamespace = 'public'::regnamespace
        AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE')));

  RETURN QUERY
  SELECT
    'run_summary_counts_observed'::text,
    EXISTS (
      SELECT 1 FROM information_schema.columns col
       WHERE col.table_schema = 'public'
         AND col.table_name = 'agent_healing_runs'
         AND col.column_name = 'agents_observed'
    ),
    COALESCE(
      (SELECT 'agent_healing_runs.agents_observed ' || col.data_type
         FROM information_schema.columns col
        WHERE col.table_schema = 'public'
          AND col.table_name = 'agent_healing_runs'
          AND col.column_name = 'agents_observed'),
      'coluna agents_observed ausente em agent_healing_runs'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.healing_arbiter_invariants() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.healing_arbiter_invariants() FROM anon;
GRANT EXECUTE ON FUNCTION public.healing_arbiter_invariants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.healing_arbiter_invariants() TO service_role;