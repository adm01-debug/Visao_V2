-- =============================================================================
-- Guardrail de persistencia - public.import_settings_backup(jsonb, text)
--
-- Prova, de forma NAO destrutiva e sem dependencia de pgTAP, que a importacao de
-- backup de configuracao realmente grava:
--   1. `skip` cria cameras, zonas, regras e notificacoes (nada de resposta vazia).
--   2. As zonas sao remapeadas para as cameras criadas (nao ficam orfas).
--   3. Um segundo `skip` nao duplica nada (idempotencia por id do backup).
--   4. `overwrite` atualiza no lugar, sem duplicar.
--   5. Cada chamada registra auditoria em public.audit_logs.
--   6. Anon nao pode executar a importacao.
--
-- Executada por `scripts/check-settings-backup-import.mjs`
-- (comando `npm run db:check:settings-backup`).
-- Roda inteiramente dentro de uma transacao com ROLLBACK - nao altera estado.
-- =============================================================================
BEGIN;

-- Contexto de usuario: cobre auth.uid() via request.jwt.claims e via claim.sub.
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

SET LOCAL ROLE authenticated;

DO $suite$
DECLARE
  test_uid uuid := '11111111-1111-1111-1111-111111111111';
  payload jsonb := $json${
    "schema_version": "1.0.0",
    "exported_at": "2026-11-27T00:00:00.000Z",
    "data": {
      "cameras": [
        {"id": "aaaaaaaa-0000-4000-8000-000000000001", "name": "Guardrail Cam A", "location": "Portao", "status": "online"},
        {"id": "aaaaaaaa-0000-4000-8000-000000000002", "name": "Guardrail Cam B", "location": "Patio", "status": "offline"}
      ],
      "zones": [
        {"id": "bbbbbbbb-0000-4000-8000-000000000001", "camera_id": "aaaaaaaa-0000-4000-8000-000000000001", "name": "Guardrail Z1", "type": "counting", "points": [{"x": 1, "y": 2}], "color": "#f00", "is_active": true},
        {"id": "bbbbbbbb-0000-4000-8000-000000000002", "camera_id": "aaaaaaaa-0000-4000-8000-000000000002", "name": "Guardrail Z2", "type": "tripwire"}
      ],
      "rules": [
        {"id": "cccccccc-0000-4000-8000-000000000001", "name": "Guardrail Regra", "description": "d", "category": "safety", "severity": "critical", "conditions": [{"type": "person"}], "actions": ["alert", "notify"], "cameras": ["aaaaaaaa-0000-4000-8000-000000000001"], "is_active": false, "schedule_cron": "*/5 * * * *"}
      ],
      "notifications": [
        {"id": "dddddddd-0000-4000-8000-000000000001", "name": "Guardrail Notif", "enabled": true, "channels": ["whatsapp"], "severity_filter": ["critical"], "email_recipients": ["ops@x.com"], "cooldown_minutes": 30, "schedule_start_time": "07:30", "schedule_end_time": "19:30", "schedule_days": [1, 2, 3]}
      ]
    }
  }$json$::jsonb;
  res jsonb;
  payload2 jsonb;
  checks int := 0;
  failures text[] := ARRAY[]::text[];
  n int;
BEGIN
  -- Limpeza defensiva do usuario de teste (a transacao termina em ROLLBACK).
  BEGIN
    DELETE FROM public.notification_configs WHERE user_id = test_uid;
    DELETE FROM public.rules WHERE user_id = test_uid;
    DELETE FROM public.zones z USING public.cameras c WHERE z.camera_id = c.id AND c.user_id = test_uid;
    DELETE FROM public.cameras WHERE user_id = test_uid;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- 1: primeira importacao grava tudo
  res := public.import_settings_backup(payload, 'skip');

  checks := checks + 1;
  IF COALESCE((res->'imported'->>'cameras')::int, -1) <> 2 THEN
    failures := failures || format('skip: cameras=%s (esperado 2)', res->'imported'->>'cameras');
  END IF;
  checks := checks + 1;
  IF COALESCE((res->'imported'->>'zones')::int, -1) <> 2 THEN
    failures := failures || format('skip: zones=%s (esperado 2)', res->'imported'->>'zones');
  END IF;
  checks := checks + 1;
  IF COALESCE((res->'imported'->>'rules')::int, -1) <> 1 THEN
    failures := failures || format('skip: rules=%s (esperado 1)', res->'imported'->>'rules');
  END IF;
  checks := checks + 1;
  IF COALESCE((res->'imported'->>'notifications')::int, -1) <> 1 THEN
    failures := failures || format('skip: notifications=%s (esperado 1)', res->'imported'->>'notifications');
  END IF;
  checks := checks + 1;
  IF (res->>'strategy') IS DISTINCT FROM 'skip' THEN
    failures := failures || format('skip: strategy=%s', res->>'strategy');
  END IF;

  -- 2: persistencia real por tabela
  SELECT count(*) INTO n FROM public.cameras WHERE user_id = test_uid;
  checks := checks + 1;
  IF n <> 2 THEN failures := failures || format('persistencia cameras=%s (esperado 2)', n); END IF;

  SELECT count(*) INTO n
  FROM public.zones z JOIN public.cameras c ON c.id = z.camera_id
  WHERE c.user_id = test_uid;
  checks := checks + 1;
  IF n <> 2 THEN failures := failures || format('persistencia zones=%s (esperado 2)', n); END IF;

  -- zonas remapeadas para cameras do proprio usuario (nada orfao)
  SELECT count(*) INTO n
  FROM public.zones z JOIN public.cameras c ON c.id = z.camera_id
  WHERE c.user_id = test_uid AND z.name LIKE 'Guardrail Z%';
  checks := checks + 1;
  IF n <> 2 THEN failures := failures || format('remapeamento zones=%s (esperado 2)', n); END IF;

  -- ...e cada zona na camera certa: achar 2 zonas nao prova o par correto.
  SELECT count(*) INTO n
  FROM public.zones z JOIN public.cameras c ON c.id = z.camera_id
  WHERE c.user_id = test_uid AND c.name = 'Guardrail Cam A' AND z.name = 'Guardrail Z1';
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('remapeamento Z1->Cam A = %s (esperado 1)', n); END IF;

  SELECT count(*) INTO n
  FROM public.zones z JOIN public.cameras c ON c.id = z.camera_id
  WHERE c.user_id = test_uid AND c.name = 'Guardrail Cam B' AND z.name = 'Guardrail Z2';
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('remapeamento Z2->Cam B = %s (esperado 1)', n); END IF;

  SELECT count(*) INTO n FROM public.rules WHERE user_id = test_uid;
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('persistencia rules=%s (esperado 1)', n); END IF;

  SELECT count(*) INTO n FROM public.notification_configs WHERE user_id = test_uid;
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('persistencia notifications=%s (esperado 1)', n); END IF;

  -- 3: segundo `skip` nao duplica
  res := public.import_settings_backup(payload, 'skip');
  checks := checks + 1;
  IF COALESCE((res->'imported'->>'cameras')::int, -1) <> 0 THEN
    failures := failures || 'skip repetido criou cameras duplicadas';
  END IF;
  checks := checks + 1;
  IF COALESCE((res->>'skipped')::int, 0) < 6 THEN
    failures := failures || format('skip repetido: skipped=%s (esperado >= 6)', res->>'skipped');
  END IF;

  SELECT count(*) INTO n FROM public.cameras WHERE user_id = test_uid;
  checks := checks + 1;
  IF n <> 2 THEN failures := failures || format('skip repetido duplicou cameras=%s', n); END IF;

  -- 4: `overwrite` atualiza sem duplicar e grava os valores do novo arquivo
  payload2 := jsonb_set(payload, '{data,cameras,0,name}', '"Guardrail Cam A v2"');
  payload2 := jsonb_set(payload2, '{data,rules,0,description}', '"descricao atualizada"');
  payload2 := jsonb_set(payload2, '{data,notifications,0,cooldown_minutes}', '45');
  res := public.import_settings_backup(payload2, 'overwrite');
  checks := checks + 1;
  IF COALESCE((res->>'updated')::int, 0) < 1 THEN
    failures := failures || format('overwrite: updated=%s (esperado >= 1)', res->>'updated');
  END IF;

  SELECT count(*) INTO n FROM public.cameras WHERE user_id = test_uid;
  checks := checks + 1;
  IF n <> 2 THEN failures := failures || format('overwrite duplicou cameras=%s', n); END IF;

  SELECT count(*) INTO n FROM public.notification_configs WHERE user_id = test_uid;
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('overwrite duplicou notifications=%s', n); END IF;

  -- `updated` no JSON nao prova escrita: confere o valor novo no banco.
  SELECT count(*) INTO n
  FROM public.cameras WHERE user_id = test_uid AND name = 'Guardrail Cam A v2';
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('overwrite nao gravou nome de camera = %s (esperado 1)', n); END IF;

  SELECT count(*) INTO n
  FROM public.rules WHERE user_id = test_uid AND description = 'descricao atualizada';
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('overwrite nao gravou descricao da regra = %s (esperado 1)', n); END IF;

  SELECT count(*) INTO n
  FROM public.notification_configs
  WHERE user_id = test_uid AND name = 'Guardrail Notif' AND cooldown_minutes = 45;
  checks := checks + 1;
  IF n <> 1 THEN failures := failures || format('overwrite nao gravou cooldown da notificacao = %s (esperado 1)', n); END IF;

  -- 4b: horarios da notificacao voltam no formato da coluna (text HH24:MI).
  -- A coluna e text com CHECK '^[0-2][0-9]:[0-5][0-9]$' (notif_time_format):
  -- converter para ::time gravaria '07:30:00', o INSERT seria descartado pelo
  -- EXCEPTION do laco e a notificacao sumiria do backup sem erro visivel.
  SELECT count(*) INTO n
  FROM public.notification_configs
  WHERE user_id = test_uid
    AND name = 'Guardrail Notif'
    AND schedule_start_time = '07:30'
    AND schedule_end_time = '19:30';
  checks := checks + 1;
  IF n <> 1 THEN
    failures := failures || format(
      'horario da notificacao = %s (esperado 07:30/19:30 em HH24:MI)',
      COALESCE((SELECT schedule_start_time || '/' || schedule_end_time
                FROM public.notification_configs
                WHERE user_id = test_uid AND name = 'Guardrail Notif'), 'ausente')
    );
  END IF;

  -- 5: auditoria registrada em cada chamada
  SELECT count(*) INTO n
  FROM public.audit_logs
  WHERE user_id = test_uid AND action = 'settings.import';
  checks := checks + 1;
  IF n < 3 THEN failures := failures || format('auditoria settings.import=%s (esperado >= 3)', n); END IF;

  IF array_length(failures, 1) > 0 THEN
    RAISE EXCEPTION 'Suite import_settings_backup reprovada (% falhas em % checagens): %',
      array_length(failures, 1), checks, array_to_string(failures, ' | ');
  END IF;

  RAISE NOTICE 'OK: % checagens da import_settings_backup', checks;
END;
$suite$;

-- 6: anon nao pode executar a importacao
SET LOCAL ROLE anon;

DO $anon$
BEGIN
  BEGIN
    PERFORM public.import_settings_backup('{"schema_version":"1.0.0","data":{}}'::jsonb, 'skip');
    RAISE EXCEPTION 'anon conseguiu executar import_settings_backup';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END;
$anon$;

ROLLBACK;