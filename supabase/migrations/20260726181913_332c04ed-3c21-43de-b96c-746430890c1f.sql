DO $$
DECLARE
  src text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO src
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents';

  IF src IS NULL THEN
    RAISE EXCEPTION 'heal_local_agents nao encontrada';
  END IF;

  IF position('task_expired_deadline' in src) = 0 THEN
    src := replace(
      src,
      $m$'relay_backend_abandoned')) AS expired$m$,
      $m$'relay_backend_abandoned',
                                                                  'task_expired_deadline')) AS expired$m$);
    EXECUTE src;
  END IF;
END $$;