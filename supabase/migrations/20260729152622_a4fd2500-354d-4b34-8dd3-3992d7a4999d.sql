CREATE OR REPLACE FUNCTION public.retention_debut_selftest()
 RETURNS TABLE(check_name text, passed boolean, detail text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_now     timestamptz := timestamptz '2099-06-01 00:00:00+00';
  v_started timestamptz := clock_timestamp();
  v_res     jsonb;
  v_row     jsonb;
BEGIN
  -- Relógio nulo recusa sem efeito colateral.
  v_res := public.evaluate_retention_alerts(NULL);
  RETURN QUERY SELECT 'recusa_relogio_nulo',
                      (v_res->>'ok')::boolean IS FALSE AND v_res->>'refusal' = 'bad_now',
                      v_res::text;

  -- Avaliação num futuro distante: toda rotina já passou da carência de
  -- estreia, então nenhuma pode ficar em `pending_first_run`.
  v_res := public.evaluate_retention_alerts(v_now);
  RETURN QUERY SELECT 'futuro_sem_carencia',
                      (v_res->>'pending_first_run')::int = 0,
                      v_res->>'pending_first_run';

  -- Toda rotina do registro aparece no resultado, com veredito conhecido.
  RETURN QUERY
    SELECT 'vereditos_conhecidos',
           bool_and(r->>'health' IN ('ok','warn','stalled','pending_first_run','never')),
           string_agg(r->>'job_name' || '=' || (r->>'health'), ',')
      FROM jsonb_array_elements(v_res->'routines') r;

  RETURN QUERY
    SELECT 'cobertura_registro',
           jsonb_array_length(v_res->'routines') = (SELECT count(*)::int FROM public.retention_routine_registry()),
           jsonb_array_length(v_res->'routines')::text;

  -- Rotina nunca executada, avaliada logo após o registro, fica em carência.
  SELECT to_jsonb(x) INTO v_row
    FROM (
      SELECT job_name, registered_at, cadence_minutes
        FROM public.retention_routine_registry()
       WHERE job_name = 'dispatch_suppressions'
    ) x;

  v_res := public.evaluate_retention_alerts(
    (v_row->>'registered_at')::timestamptz + interval '1 minute'
  );
  RETURN QUERY
    SELECT 'estreia_em_carencia',
           (SELECT r->>'health' = 'pending_first_run' AND r->>'severity' = 'none'
              FROM jsonb_array_elements(v_res->'routines') r
             WHERE r->>'job_name' = 'dispatch_suppressions'),
           (v_res->'routines')::text;

  -- Passada a carência, a mesma rotina sem execução vira crítica.
  v_res := public.evaluate_retention_alerts(
    (v_row->>'registered_at')::timestamptz
      + ((v_row->>'cadence_minutes')::int + 16) * interval '1 minute'
  );
  RETURN QUERY
    SELECT 'estreia_perdida_critica',
           (SELECT r->>'health' = 'never' AND r->>'severity' = 'critical'
              FROM jsonb_array_elements(v_res->'routines') r
             WHERE r->>'job_name' = 'dispatch_suppressions'),
           (v_res->'routines')::text;

  -- Limpeza: o autoteste não pode deixar aviso sintético no barramento.
  DELETE FROM public.maintenance_alert_events
   WHERE created_at >= v_started
     AND routine LIKE 'retention:%';

  RETURN QUERY
    SELECT 'limpeza_sem_residuo',
           NOT EXISTS (
             SELECT 1 FROM public.maintenance_alert_events
              WHERE created_at >= v_started AND routine LIKE 'retention:%'
           ),
           'ok';
END;
$function$;