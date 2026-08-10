
-- ============================================================
-- Onda 52 — api_usage_logs (telemetria da API REST v1)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  method TEXT NOT NULL CHECK (method IN ('GET','POST','PUT','DELETE','PATCH','OPTIONS','HEAD')),
  path TEXT NOT NULL CHECK (length(path) <= 512),
  endpoint_group TEXT CHECK (length(endpoint_group) <= 64),
  status INT NOT NULL CHECK (status BETWEEN 100 AND 599),
  latency_ms INT CHECK (latency_ms >= 0 AND latency_ms < 600000),
  api_version TEXT NOT NULL DEFAULT 'v1',
  ip_hash TEXT CHECK (length(ip_hash) <= 128),
  user_agent_hash TEXT CHECK (length(user_agent_hash) <= 128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_user_created ON public.api_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON public.api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint_group ON public.api_usage_logs(endpoint_group, created_at DESC);

GRANT SELECT ON public.api_usage_logs TO authenticated;
GRANT ALL ON public.api_usage_logs TO service_role;

ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own api logs"
  ON public.api_usage_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Cleanup 90d via extensão do run_retention_cleanup existente
-- (Nova função para permitir chamada manual/isolada)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_api_usage_logs()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  removed BIGINT;
BEGIN
  DELETE FROM public.api_usage_logs WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS removed = ROW_COUNT;
  RETURN removed;
END;
$$;

-- ============================================================
-- Agregado para dashboard /admin/api-usage
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_api_usage_stats(_days INT DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  by_endpoint jsonb;
  by_status jsonb;
  by_day jsonb;
  totals jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores.' USING ERRCODE = '42501';
  END IF;

  IF _days < 1 OR _days > 90 THEN _days := 7; END IF;

  SELECT jsonb_build_object(
    'total_requests', COUNT(*),
    'unique_users', COUNT(DISTINCT user_id),
    'error_rate_pct', ROUND(100.0 * COUNT(*) FILTER (WHERE status >= 400)::numeric / NULLIF(COUNT(*), 0), 2),
    'avg_latency_ms', ROUND(AVG(latency_ms)::numeric, 2),
    'p95_latency_ms', percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
  ) INTO totals
  FROM public.api_usage_logs
  WHERE created_at > now() - make_interval(days => _days);

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO by_endpoint FROM (
    SELECT endpoint_group, COUNT(*) AS count,
           ROUND(AVG(latency_ms)::numeric, 2) AS avg_latency_ms
    FROM public.api_usage_logs
    WHERE created_at > now() - make_interval(days => _days)
      AND endpoint_group IS NOT NULL
    GROUP BY endpoint_group
    ORDER BY count DESC
    LIMIT 20
  ) t;

  SELECT COALESCE(jsonb_object_agg(status::text, count), '{}'::jsonb) INTO by_status FROM (
    SELECT status, COUNT(*) AS count
    FROM public.api_usage_logs
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY status
  ) s;

  SELECT COALESCE(jsonb_agg(row_to_json(d) ORDER BY d.day), '[]'::jsonb) INTO by_day FROM (
    SELECT date_trunc('day', created_at)::date AS day, COUNT(*) AS count
    FROM public.api_usage_logs
    WHERE created_at > now() - make_interval(days => _days)
    GROUP BY 1
    ORDER BY 1
  ) d;

  result := jsonb_build_object(
    'window_days', _days,
    'totals', totals,
    'by_endpoint', by_endpoint,
    'by_status', by_status,
    'by_day', by_day,
    'generated_at', now()
  );
  RETURN result;
END;
$$;

-- ============================================================
-- Onda 46.1 — Import transacional de config
-- ============================================================
CREATE OR REPLACE FUNCTION public.import_settings_backup(_payload jsonb, _strategy text DEFAULT 'skip')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  schema_ver text;
  cameras_arr jsonb;
  zones_arr jsonb;
  rules_arr jsonb;
  inserted_cameras int := 0;
  inserted_zones int := 0;
  inserted_rules int := 0;
  skipped int := 0;
  rec jsonb;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado' USING ERRCODE = '42501';
  END IF;
  IF _strategy NOT IN ('skip', 'overwrite') THEN
    RAISE EXCEPTION 'strategy inválida: %', _strategy USING ERRCODE = '22023';
  END IF;

  schema_ver := _payload->>'schema_version';
  IF schema_ver IS NULL OR schema_ver <> '1.0.0' THEN
    RAISE EXCEPTION 'schema_version inválida (esperado 1.0.0): %', schema_ver USING ERRCODE = '22023';
  END IF;

  cameras_arr := COALESCE(_payload->'data'->'cameras', '[]'::jsonb);
  zones_arr   := COALESCE(_payload->'data'->'zones',   '[]'::jsonb);
  rules_arr   := COALESCE(_payload->'data'->'rules',   '[]'::jsonb);

  -- Limite de segurança (evita DoS via payload gigante)
  IF jsonb_array_length(cameras_arr) + jsonb_array_length(zones_arr) + jsonb_array_length(rules_arr) > 2000 THEN
    RAISE EXCEPTION 'Backup excede limite de 2000 registros combinados' USING ERRCODE = '54000';
  END IF;

  -- Cameras
  FOR rec IN SELECT * FROM jsonb_array_elements(cameras_arr) LOOP
    BEGIN
      INSERT INTO public.cameras (name, location, type, status, user_id)
      VALUES (
        rec->>'name',
        rec->>'location',
        rec->>'type',
        COALESCE(rec->>'status', 'offline'),
        caller
      )
      ON CONFLICT DO NOTHING;
      IF FOUND THEN inserted_cameras := inserted_cameras + 1;
      ELSE skipped := skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
    END;
  END LOOP;

  -- Zones (só se camera_id ainda existir para o usuário)
  FOR rec IN SELECT * FROM jsonb_array_elements(zones_arr) LOOP
    BEGIN
      IF EXISTS (SELECT 1 FROM public.zones WHERE id = (rec->>'id')::uuid) THEN
        skipped := skipped + 1;
        CONTINUE;
      END IF;
      INSERT INTO public.zones (camera_id, name, coordinates, user_id)
      SELECT (rec->>'camera_id')::uuid, rec->>'name', rec->'coordinates', caller
      WHERE EXISTS (SELECT 1 FROM public.cameras WHERE id = (rec->>'camera_id')::uuid AND user_id = caller);
      IF FOUND THEN inserted_zones := inserted_zones + 1;
      ELSE skipped := skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
    END;
  END LOOP;

  -- Rules
  FOR rec IN SELECT * FROM jsonb_array_elements(rules_arr) LOOP
    BEGIN
      INSERT INTO public.rules (name, description, conditions, actions, enabled, user_id)
      VALUES (
        rec->>'name',
        rec->>'description',
        COALESCE(rec->'conditions', '[]'::jsonb),
        COALESCE(rec->'actions', '[]'::jsonb),
        COALESCE((rec->>'enabled')::boolean, true),
        caller
      );
      inserted_rules := inserted_rules + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
    END;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
  VALUES (caller, 'settings.import', 'backup', gen_random_uuid(),
          jsonb_build_object('cameras', inserted_cameras, 'zones', inserted_zones, 'rules', inserted_rules, 'skipped', skipped));

  RETURN jsonb_build_object(
    'imported', jsonb_build_object(
      'cameras', inserted_cameras,
      'zones', inserted_zones,
      'rules', inserted_rules
    ),
    'skipped', skipped,
    'strategy', _strategy,
    'schema_version', schema_ver
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_settings_backup(jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_settings_backup(jsonb, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_api_usage_stats(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_api_usage_stats(int) TO authenticated;
REVOKE ALL ON FUNCTION public.cleanup_api_usage_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_api_usage_logs() TO service_role;
