-- Corrige import_settings_backup: a versao anterior usava colunas que nao existem
-- no schema real (cameras.type, zones.coordinates, rules.enabled, rules.user_id
-- inexistente na epoca, notification_configs ignorado). Resultado: cada registro
-- caia no EXCEPTION e era contado como "skipped", o import terminava com 200 e
-- nada era restaurado. Tambem nao aplicava _strategy e nao remapeava as zonas
-- para as cameras recem-criadas (novos IDs).
--
-- ROLLBACK:
--   BEGIN;
--   -- Reinstala a definicao ANTERIOR de import_settings_backup, que esta em
--   -- supabase/migrations/20260717115007_a8191482-15ac-4801-9180-bb179b34e9ba.sql:126
--   -- (CREATE OR REPLACE da funcao). Reaplique SO esse trecho: migracoes
--   -- vizinhas criam constraints/tabelas que ja existem no banco migrado e
--   -- abortam a transacao, deixando a funcao atual no lugar.
--   -- Efeito: o import volta a nao gravar nada, ignora _strategy e nao devolve
--   -- `imported->notifications`.
--   COMMIT;

BEGIN;

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
  notifs_arr jsonb;
  inserted_cameras int := 0;
  inserted_zones int := 0;
  inserted_rules int := 0;
  inserted_notifs int := 0;
  updated int := 0;
  skipped int := 0;
  errors jsonb := '[]'::jsonb;
  rec jsonb;
  rec_id text;
  new_camera_id uuid;
  new_id uuid;
  target_camera_id uuid;
  camera_map jsonb := '{}'::jsonb;
  actions_txt text[];
  channels_txt text[];
  sev_txt text[];
  days_txt int[];
  zone_type_txt text;
BEGIN
  IF caller IS NULL THEN
    RAISE EXCEPTION 'Nao autenticado' USING ERRCODE = '42501';
  END IF;
  IF _strategy NOT IN ('skip', 'overwrite') THEN
    RAISE EXCEPTION 'strategy invalida: %', _strategy USING ERRCODE = '22023';
  END IF;

  schema_ver := _payload->>'schema_version';
  IF schema_ver IS NULL OR schema_ver <> '1.0.0' THEN
    RAISE EXCEPTION 'schema_version invalida (esperado 1.0.0): %', schema_ver USING ERRCODE = '22023';
  END IF;

  cameras_arr := COALESCE(_payload->'data'->'cameras', '[]'::jsonb);
  zones_arr   := COALESCE(_payload->'data'->'zones',   '[]'::jsonb);
  rules_arr   := COALESCE(_payload->'data'->'rules',   '[]'::jsonb);
  notifs_arr  := COALESCE(_payload->'data'->'notifications', '[]'::jsonb);

  IF jsonb_typeof(cameras_arr) <> 'array' OR jsonb_typeof(zones_arr) <> 'array'
     OR jsonb_typeof(rules_arr) <> 'array' OR jsonb_typeof(notifs_arr) <> 'array' THEN
    RAISE EXCEPTION 'Payload invalido: as colecoes devem ser listas' USING ERRCODE = '22023';
  END IF;

  -- Limite de seguranca (evita DoS via payload gigante)
  IF jsonb_array_length(cameras_arr) + jsonb_array_length(zones_arr)
     + jsonb_array_length(rules_arr) + jsonb_array_length(notifs_arr) > 2000 THEN
    RAISE EXCEPTION 'Backup excede limite de 2000 registros combinados' USING ERRCODE = '54000';
  END IF;

  -- ---------------- Cameras ----------------
  FOR rec IN SELECT * FROM jsonb_array_elements(cameras_arr) LOOP
    BEGIN
      rec_id := NULLIF(btrim(COALESCE(rec->>'id', '')), '');
      new_camera_id := NULL;

      IF rec_id IS NOT NULL AND rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        SELECT id INTO new_camera_id
        FROM public.cameras
        WHERE id = rec_id::uuid AND user_id = caller;
      END IF;

      IF new_camera_id IS NOT NULL THEN
        IF _strategy = 'overwrite' THEN
          -- cameras nao tem "type"; os campos reais sao name/location/status.
          UPDATE public.cameras SET
            name = COALESCE(NULLIF(btrim(rec->>'name'), ''), name),
            location = COALESCE(rec->>'location', location),
            status = COALESCE(NULLIF(rec->>'status', '')::camera_status, status),
            updated_at = now()
          WHERE id = new_camera_id;
          updated := updated + 1;
        ELSE
          skipped := skipped + 1;
        END IF;
        camera_map := camera_map || jsonb_build_object(rec_id, new_camera_id::text);
        CONTINUE;
      END IF;

      IF NULLIF(btrim(COALESCE(rec->>'name', '')), '') IS NULL THEN
        skipped := skipped + 1;
        errors := errors || to_jsonb('Camera ignorada: sem nome'::text);
        CONTINUE;
      END IF;

      new_id := NULL;
      IF rec_id IS NOT NULL
         AND rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND NOT EXISTS (SELECT 1 FROM public.cameras WHERE id = rec_id::uuid) THEN
        -- preserva a identidade do backup para que o modo skip seja idempotente
        new_id := rec_id::uuid;
      END IF;

      INSERT INTO public.cameras (id, name, location, status, user_id)
      VALUES (
        COALESCE(new_id, gen_random_uuid()),
        btrim(rec->>'name'),
        rec->>'location',
        COALESCE(NULLIF(rec->>'status', '')::camera_status, 'offline'),
        caller
      )
      RETURNING id INTO new_camera_id;

      inserted_cameras := inserted_cameras + 1;
      IF rec_id IS NOT NULL THEN
        camera_map := camera_map || jsonb_build_object(rec_id, new_camera_id::text);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
      IF jsonb_array_length(errors) < 5 THEN
        errors := errors || to_jsonb(('camera: ' || SQLERRM)::text);
      END IF;
    END;
  END LOOP;

  -- ---------------- Zonas ----------------
  -- O CHECK zones_type_valid aceita apenas 6 rotulos e o enum zone_type cobre 9;
  -- usar a intersecao (restricted/counting) evita 23514/22P02 e preserva a intencao.
  FOR rec IN SELECT * FROM jsonb_array_elements(zones_arr) LOOP
    BEGIN
      rec_id := NULLIF(btrim(COALESCE(rec->>'id', '')), '');
      target_camera_id := NULL;

      IF rec_id IS NOT NULL AND camera_map ? rec_id THEN
        -- camera criada/atualizada nesta importacao: usa o novo id
        target_camera_id := (camera_map->>rec_id)::uuid;
      ELSE
        IF NULLIF(btrim(COALESCE(rec->>'camera_id', '')), '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
          SELECT id INTO target_camera_id
          FROM public.cameras
          WHERE id = (rec->>'camera_id')::uuid AND user_id = caller;
        END IF;
        -- a camera do arquivo tambem pode ter sido remapeada pelo seu proprio id
        IF target_camera_id IS NULL AND (rec->>'camera_id') IS NOT NULL AND camera_map ? (rec->>'camera_id') THEN
          target_camera_id := (camera_map->>(rec->>'camera_id'))::uuid;
        END IF;
      END IF;

      IF target_camera_id IS NULL THEN
        skipped := skipped + 1;
        IF jsonb_array_length(errors) < 5 THEN
          errors := errors || to_jsonb('Zona ignorada: camera do arquivo nao existe'::text);
        END IF;
        CONTINUE;
      END IF;

      zone_type_txt := CASE
        WHEN rec->>'type' IN ('counting', 'occupancy', 'queue', 'parking') THEN 'counting'
        ELSE 'restricted'
      END;

      IF rec_id IS NOT NULL
         AND rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND EXISTS (
           SELECT 1 FROM public.zones z
           JOIN public.cameras c ON c.id = z.camera_id
           WHERE z.id = rec_id::uuid AND c.user_id = caller
         ) THEN
        IF _strategy = 'overwrite' THEN
          -- a coluna real e "points" (jsonb), nao "coordinates"
          UPDATE public.zones SET
            name = COALESCE(NULLIF(btrim(rec->>'name'), ''), name),
            points = COALESCE(rec->'points', points),
            type = zone_type_txt::zone_type,
            color = COALESCE(rec->>'color', color),
            is_active = COALESCE((rec->>'is_active')::boolean, is_active),
            updated_at = now()
          WHERE id = rec_id::uuid;
          updated := updated + 1;
        ELSE
          skipped := skipped + 1;
        END IF;
        CONTINUE;
      END IF;

      new_id := NULL;
      IF rec_id IS NOT NULL
         AND rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND NOT EXISTS (SELECT 1 FROM public.zones WHERE id = rec_id::uuid) THEN
        new_id := rec_id::uuid;
      END IF;

      INSERT INTO public.zones (id, camera_id, name, type, points, color, is_active, user_id)
      VALUES (
        COALESCE(new_id, gen_random_uuid()),
        target_camera_id,
        COALESCE(NULLIF(btrim(rec->>'name'), ''), 'Zona importada'),
        zone_type_txt::zone_type,
        COALESCE(rec->'points', '[]'::jsonb),
        COALESCE(rec->>'color', 'hsl(var(--primary))'),
        COALESCE((rec->>'is_active')::boolean, true),
        caller
      );
      inserted_zones := inserted_zones + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
      IF jsonb_array_length(errors) < 5 THEN
        errors := errors || to_jsonb(('zona: ' || SQLERRM)::text);
      END IF;
    END;
  END LOOP;

  -- ---------------- Regras ----------------
  FOR rec IN SELECT * FROM jsonb_array_elements(rules_arr) LOOP
    BEGIN
      rec_id := NULLIF(btrim(COALESCE(rec->>'id', '')), '');
      IF NULLIF(btrim(COALESCE(rec->>'name', '')), '') IS NULL THEN
        skipped := skipped + 1;
        errors := errors || to_jsonb('Regra ignorada: sem nome'::text);
        CONTINUE;
      END IF;

      actions_txt := ARRAY(
        SELECT a FROM unnest(
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'actions', '[]'::jsonb)))
        ) AS t(a)
        WHERE a IN ('alert', 'notify', 'record', 'lockdown', 'dispatch')
      );

      IF EXISTS (SELECT 1 FROM public.rules WHERE user_id = caller AND name = btrim(rec->>'name')) THEN
        IF _strategy <> 'overwrite' THEN
          -- sem id estavel na regra: no modo skip o nome repetido e ignorado
          skipped := skipped + 1;
          CONTINUE;
        END IF;
        -- rules usa is_active (nao "enabled") e pertence ao usuario via user_id
        UPDATE public.rules SET
          description = COALESCE(rec->>'description', description),
          category = COALESCE(NULLIF(rec->>'category', ''), category::text)::rule_category,
          severity = COALESCE(NULLIF(rec->>'severity', ''), severity::text)::rule_severity,
          conditions = CASE WHEN jsonb_typeof(rec->'conditions') = 'array' THEN rec->'conditions' ELSE conditions END,
          actions = CASE WHEN array_length(actions_txt, 1) IS NULL THEN actions ELSE actions_txt::rule_action[] END,
          cameras = CASE
            WHEN jsonb_typeof(rec->'cameras') = 'array' THEN ARRAY(
              SELECT COALESCE(camera_map->>elem, elem)
              FROM jsonb_array_elements_text(rec->'cameras') AS t(elem)
            )
            ELSE cameras
          END,
          is_active = COALESCE((rec->>'is_active')::boolean, is_active),
          updated_at = now()
        WHERE user_id = caller AND name = btrim(rec->>'name');
        updated := updated + 1;
        CONTINUE;
      END IF;

      new_id := NULL;
      IF rec_id IS NOT NULL
         AND rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND NOT EXISTS (SELECT 1 FROM public.rules WHERE id = rec_id::uuid) THEN
        new_id := rec_id::uuid;
      END IF;

      INSERT INTO public.rules (
        id, user_id, name, description, category, severity,
        conditions, actions, cameras, schedule, schedule_cron, is_active
      ) VALUES (
        COALESCE(new_id, gen_random_uuid()),
        caller,
        btrim(rec->>'name'),
        rec->>'description',
        COALESCE(NULLIF(rec->>'category', ''), 'security')::rule_category,
        COALESCE(NULLIF(rec->>'severity', ''), 'medium')::rule_severity,
        COALESCE(rec->'conditions', '[]'::jsonb),
        COALESCE(actions_txt::rule_action[], ARRAY[]::rule_action[]),
        COALESCE(
          ARRAY(
            SELECT COALESCE(camera_map->>elem, elem)
            FROM jsonb_array_elements_text(rec->'cameras') AS t(elem)
          ),
          ARRAY[]::text[]
        ),
        rec->'schedule',
        NULLIF(btrim(COALESCE(rec->>'schedule_cron', '')), ''),
        COALESCE((rec->>'is_active')::boolean, true)
      );
      inserted_rules := inserted_rules + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
      IF jsonb_array_length(errors) < 5 THEN
        errors := errors || to_jsonb(('regra: ' || SQLERRM)::text);
      END IF;
    END;
  END LOOP;

  -- ---------------- Notificacoes ----------------
  FOR rec IN SELECT * FROM jsonb_array_elements(notifs_arr) LOOP
    BEGIN
      rec_id := NULLIF(btrim(COALESCE(rec->>'id', '')), '');
      -- notification_configs guarda channels/severity_filter (nao "type"/"filters")
      channels_txt := ARRAY(
        SELECT c FROM unnest(
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'channels', '[]'::jsonb)))
        ) AS t(c)
        WHERE c IN ('email', 'sms', 'webhook', 'push', 'telegram', 'whatsapp', 'slack')
      );
      sev_txt := ARRAY(
        SELECT s FROM unnest(
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'severity_filter', '[]'::jsonb)))
        ) AS t(s)
        WHERE s IN ('low', 'medium', 'high', 'critical', 'info')
      );
      days_txt := ARRAY(
        SELECT d::int FROM unnest(
          ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'schedule_days', '[]'::jsonb)))
        ) AS t(d)
        WHERE d ~ '^[0-6]$'
      );

      IF EXISTS (
        SELECT 1 FROM public.notification_configs
        WHERE user_id = caller
          AND name = COALESCE(NULLIF(btrim(rec->>'name'), ''), 'Configuracao importada')
      ) THEN
        IF _strategy <> 'overwrite' THEN
          skipped := skipped + 1;
          CONTINUE;
        END IF;
        UPDATE public.notification_configs SET
          enabled = COALESCE((rec->>'enabled')::boolean, enabled),
          channels = CASE WHEN array_length(channels_txt, 1) IS NULL THEN channels ELSE channels_txt END,
          severity_filter = CASE WHEN array_length(sev_txt, 1) IS NULL THEN severity_filter ELSE sev_txt END,
          email_recipients = ARRAY(
            SELECT e FROM unnest(
              ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'email_recipients', '[]'::jsonb)))
            ) AS t(e)
          ),
          phone_recipients = ARRAY(
            SELECT p FROM unnest(
              ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'phone_recipients', '[]'::jsonb)))
            ) AS t(p)
          ),
          webhook_urls = ARRAY(
            SELECT w FROM unnest(
              ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'webhook_urls', '[]'::jsonb)))
            ) AS t(w)
          ),
          cooldown_minutes = COALESCE((rec->>'cooldown_minutes')::int, cooldown_minutes),
          schedule_enabled = COALESCE((rec->>'schedule_enabled')::boolean, schedule_enabled),
          schedule_start_time = COALESCE(NULLIF(rec->>'schedule_start_time', '')::time, schedule_start_time),
          schedule_end_time = COALESCE(NULLIF(rec->>'schedule_end_time', '')::time, schedule_end_time),
          schedule_days = COALESCE(days_txt, schedule_days),
          updated_at = now()
        WHERE user_id = caller
          AND name = COALESCE(NULLIF(btrim(rec->>'name'), ''), 'Configuracao importada');
        updated := updated + 1;
        CONTINUE;
      END IF;

      new_id := NULL;
      IF rec_id IS NOT NULL
         AND rec_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         AND NOT EXISTS (SELECT 1 FROM public.notification_configs WHERE id = rec_id::uuid) THEN
        new_id := rec_id::uuid;
      END IF;

      INSERT INTO public.notification_configs (
        id, user_id, name, enabled, channels, severity_filter,
        email_recipients, phone_recipients, webhook_urls,
        cooldown_minutes, schedule_enabled, schedule_start_time, schedule_end_time, schedule_days
      ) VALUES (
        COALESCE(new_id, gen_random_uuid()),
        caller,
        COALESCE(NULLIF(btrim(rec->>'name'), ''), 'Configuracao importada'),
        COALESCE((rec->>'enabled')::boolean, true),
        CASE WHEN array_length(channels_txt, 1) IS NULL THEN ARRAY['email']::text[] ELSE channels_txt END,
        CASE WHEN array_length(sev_txt, 1) IS NULL THEN ARRAY['high', 'critical']::text[] ELSE sev_txt END,
        ARRAY(
          SELECT e FROM unnest(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'email_recipients', '[]'::jsonb)))
          ) AS t(e)
        ),
        ARRAY(
          SELECT p FROM unnest(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'phone_recipients', '[]'::jsonb)))
          ) AS t(p)
        ),
        ARRAY(
          SELECT w FROM unnest(
            ARRAY(SELECT jsonb_array_elements_text(COALESCE(rec->'webhook_urls', '[]'::jsonb)))
          ) AS t(w)
        ),
        COALESCE((rec->>'cooldown_minutes')::int, 5),
        COALESCE((rec->>'schedule_enabled')::boolean, false),
        COALESCE(NULLIF(rec->>'schedule_start_time', '')::time, '08:00'::time),
        COALESCE(NULLIF(rec->>'schedule_end_time', '')::time, '22:00'::time),
        COALESCE(days_txt, ARRAY[1, 2, 3, 4, 5])
      );
      inserted_notifs := inserted_notifs + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped := skipped + 1;
      IF jsonb_array_length(errors) < 5 THEN
        errors := errors || to_jsonb(('notificacao: ' || SQLERRM)::text);
      END IF;
    END;
  END LOOP;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values, severity)
  VALUES (
    caller,
    'settings.import',
    'backup',
    gen_random_uuid(),
    jsonb_build_object(
      'cameras', inserted_cameras,
      'zones', inserted_zones,
      'rules', inserted_rules,
      'notifications', inserted_notifs,
      'updated', updated,
      'skipped', skipped,
      'strategy', _strategy
    ),
    CASE WHEN jsonb_array_length(errors) > 0 THEN 'warning' ELSE 'info' END
  );

  RETURN jsonb_build_object(
    'imported', jsonb_build_object(
      'cameras', inserted_cameras,
      'zones', inserted_zones,
      'rules', inserted_rules,
      'notifications', inserted_notifs
    ),
    'updated', updated,
    'skipped', skipped,
    'errors', errors,
    'strategy', _strategy,
    'schema_version', schema_ver
  );
END;
$$;

REVOKE ALL ON FUNCTION public.import_settings_backup(jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_settings_backup(jsonb, text) TO authenticated, service_role;

COMMIT;
