-- Suite de regressao dos comandos do pg_cron que chamam edge functions.
--
-- Cobre a migration 20261126221000_cron_edge_function_url_helpers.sql: os 14
-- jobs passam a montar URL e cabecalhos por funcao, nenhum comando guarda URL
-- ou chave literal, o header x-orchestrator e exclusivo do tiering, o job do
-- CSP leva o x-cron-secret configurado e o coletor ONVIF fica restrito.
--
-- Roda contra o banco apontado por SUPABASE_DB_URL dentro de uma transacao que
-- termina em ROLLBACK: nada e gravado de forma permanente.
-- Reprovada = psql sai com erro e lista as checagens que falharam.

BEGIN;

CREATE TEMP TABLE _esperado (jobname text PRIMARY KEY, sched text, fn text);
INSERT INTO _esperado VALUES
  ('camera_health_monitor_every_3m', '*/3 * * * *', 'camera-health-monitor'),
  ('connectivity-resolution-alert-hourly', '15 * * * *', 'connectivity-resolution-alert'),
  ('cron-watchdog-30m', '*/30 * * * *', 'cron-watchdog'),
  ('cron-watchdog-escalate-30m', '*/30 * * * *', 'cron-watchdog-escalate'),
  ('maintenance-alerts-dispatch-hourly', '33 * * * *', 'maintenance-alerts-dispatch'),
  ('preview-telemetry-alert-15min', '*/15 * * * *', 'preview-telemetry-alert'),
  ('rtsp-revalidate-scheduler-every-minute', '* * * * *', 'rtsp-revalidate-scheduler'),
  ('stream_health_probe_every_2m', '*/2 * * * *', 'stream-health-probe'),
  ('visao-csp-anomaly-notify', '*/20 * * * *', 'csp-anomaly-notify'),
  ('watchdog-ack-sla-alert-hourly', '7 * * * *', 'watchdog-ack-sla-alert'),
  ('monitoring-center-dispatch-every-minute', '* * * * *', 'monitoring-center-dispatch'),
  ('glacier-stuck-monitor-15min', '*/15 * * * *', 'glacier-stuck-monitor'),
  ('storage-tiering-orchestrator-15min', '*/15 * * * *', 'storage-tiering-orchestrator'),
  ('vault-coverage-watchdog', '*/15 * * * *', 'vault-coverage-watchdog');

CREATE TEMP TABLE _resultado (n int, descricao text, detalhe text);

DO $suite$
DECLARE
  v text;
BEGIN
  -- 1. Os 14 jobs existem.
  SELECT string_agg(e.jobname, ', ' ORDER BY e.jobname) INTO v
    FROM _esperado e LEFT JOIN cron.job j ON j.jobname = e.jobname
   WHERE j.jobname IS NULL;
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (1, 'jobs esperados presentes no cron.job', v);
  END IF;

  -- 2. O comando monta a URL pelo helper.
  SELECT string_agg(j.jobname, ', ' ORDER BY j.jobname) INTO v
    FROM cron.job j JOIN _esperado e ON e.jobname = j.jobname
   WHERE position('public.edge_function_url(' IN j.command) = 0;
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (2, 'comando usa public.edge_function_url()', v);
  END IF;

  -- 3. O comando monta os cabecalhos pelo helper e os extras por funcao.
  SELECT string_agg(j.jobname, ', ' ORDER BY j.jobname) INTO v
    FROM cron.job j JOIN _esperado e ON e.jobname = j.jobname
   WHERE position('public.edge_function_cron_headers()' IN j.command) = 0
      OR position('public.edge_function_cron_extra_headers(' IN j.command) = 0;
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (3, 'comando usa os helpers de cabecalho', v);
  END IF;

  -- 4. Nenhum comando guarda URL literal.
  SELECT string_agg(j.jobname, ', ' ORDER BY j.jobname) INTO v
    FROM cron.job j JOIN _esperado e ON e.jobname = j.jobname
   WHERE j.command ~ 'https?://';
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (4, 'comando sem URL literal', v);
  END IF;

  -- 5. Nenhum comando guarda chave JWT literal.
  SELECT string_agg(j.jobname, ', ' ORDER BY j.jobname) INTO v
    FROM cron.job j JOIN _esperado e ON e.jobname = j.jobname
   WHERE position('eyJ' IN j.command) > 0;
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (5, 'comando sem chave JWT literal', v);
  END IF;

  -- 6. A expressao cron de cada job nao mudou.
  SELECT string_agg(format('%s (%s, esperado %s)', j.jobname, j.schedule, e.sched), '; ' ORDER BY j.jobname) INTO v
    FROM cron.job j JOIN _esperado e ON e.jobname = j.jobname
   WHERE j.schedule IS DISTINCT FROM e.sched;
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (6, 'expressao cron preservada', v);
  END IF;

  -- 7. O tiering leva x-orchestrator (resolvido pelo helper, nao pelo comando).
  IF to_regprocedure('public.edge_function_cron_extra_headers(text)') IS NULL THEN
    INSERT INTO _resultado VALUES (7, 'tiering manda x-orchestrator', 'helper edge_function_cron_extra_headers ausente');
  ELSIF public.edge_function_cron_extra_headers('storage-tiering-orchestrator')
        <> '{"x-orchestrator": "1"}'::jsonb THEN
    INSERT INTO _resultado VALUES (7, 'tiering manda x-orchestrator',
      public.edge_function_cron_extra_headers('storage-tiering-orchestrator')::text);
  END IF;

  -- 8. Nenhuma outra funcao recebe x-orchestrator.
  IF to_regprocedure('public.edge_function_cron_extra_headers(text)') IS NOT NULL THEN
    SELECT string_agg(e.fn, ', ' ORDER BY e.fn) INTO v FROM _esperado e
     WHERE e.fn <> 'storage-tiering-orchestrator'
       AND public.edge_function_cron_extra_headers(e.fn) ? 'x-orchestrator';
    IF v IS NOT NULL THEN
      INSERT INTO _resultado VALUES (8, 'x-orchestrator restrito ao tiering', v);
    END IF;
  END IF;

  -- 9. O job do CSP leva x-cron-secret — e o valor vem do segredo cadastrado,
  --    nunca do texto do comando.
  IF to_regprocedure('public.edge_function_cron_extra_headers(text)') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.internal_cron_secrets WHERE name = 'retention_secret') THEN
      IF public.edge_function_cron_extra_headers('csp-anomaly-notify') ->> 'x-cron-secret'
         IS DISTINCT FROM (SELECT secret FROM public.internal_cron_secrets WHERE name = 'retention_secret') THEN
        INSERT INTO _resultado VALUES (9, 'job do CSP manda x-cron-secret',
          'header nao corresponde ao segredo cadastrado');
      END IF;
      -- O comando nao pode conter o segredo em claro.
      SELECT string_agg(j.jobname, ', ') INTO v
        FROM cron.job j, public.internal_cron_secrets s
       WHERE j.jobname = 'visao-csp-anomaly-notify' AND s.name = 'retention_secret'
         AND s.secret <> '' AND position(s.secret IN j.command) > 0;
      IF v IS NOT NULL THEN
        INSERT INTO _resultado VALUES (17, 'segredo de retencao fora do comando do job', v);
      END IF;
    END IF;
  END IF;

  -- 10 e 11. O helper de URL nao tem host embutido e le a configuracao.
  SELECT prosrc INTO v FROM pg_proc
   WHERE proname = 'edge_function_url' AND pronamespace = 'public'::regnamespace;
  IF v IS NULL THEN
    INSERT INTO _resultado VALUES (10, 'funcao public.edge_function_url(text) existe', 'ausente');
  ELSE
    IF position('supabase.co' IN v) > 0 THEN
      INSERT INTO _resultado VALUES (10, 'edge_function_url sem host literal', 'prosrc contem supabase.co');
    END IF;
    IF position('internal_cron_secrets' IN v) = 0 THEN
      INSERT INTO _resultado VALUES (11, 'edge_function_url le internal_cron_secrets', 'fonte configuravel ausente');
    END IF;
  END IF;

  -- 12. O coletor ONVIF nao carrega o schema extensions no search_path.
  SELECT array_to_string(proconfig, ',') INTO v FROM pg_proc
   WHERE proname = 'invoke_onvif_event_puller' AND pronamespace = 'public'::regnamespace;
  IF v IS NULL THEN
    INSERT INTO _resultado VALUES (12, 'invoke_onvif_event_puller existe', 'ausente');
  ELSIF position('extensions' IN v) > 0 THEN
    INSERT INTO _resultado VALUES (12, 'coletor ONVIF sem extensions no search_path', v);
  END IF;

  -- 13. O coletor ONVIF nao e executavel por anon/authenticated.
  IF to_regprocedure('public.invoke_onvif_event_puller()') IS NOT NULL THEN
    SELECT string_agg(r, ', ' ORDER BY r) INTO v FROM (VALUES ('anon'), ('authenticated')) t(r)
     WHERE has_function_privilege(r, 'public.invoke_onvif_event_puller()', 'EXECUTE');
    IF v IS NOT NULL THEN
      INSERT INTO _resultado VALUES (13, 'coletor ONVIF restrito', 'executavel por: ' || v);
    END IF;
  END IF;

  -- 14. Os helpers nao sao executaveis por anon/authenticated.
  SELECT string_agg(f.nome || '/' || r.nome, ', ' ORDER BY f.nome, r.nome) INTO v
    FROM (VALUES ('public.edge_function_url(text)'), ('public.edge_function_cron_headers()'),
                 ('public.edge_function_cron_extra_headers(text)')) f(nome)
    CROSS JOIN (VALUES ('anon'), ('authenticated')) r(nome)
   WHERE to_regprocedure(f.nome) IS NOT NULL
     AND has_function_privilege(r.nome, f.nome, 'EXECUTE');
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (14, 'helpers restritos', 'executaveis por: ' || v);
  END IF;

  -- 15. O job do coletor ONVIF EXISTE e chama a funcao do coletor. Antes a
  --     checagem so olhava jobs ja existentes: com o job ausente, passava.
  IF NOT EXISTS (SELECT 1 FROM cron.job j WHERE j.jobname ILIKE '%onvif%') THEN
    INSERT INTO _resultado VALUES (15, 'job do ONVIF chama invoke_onvif_event_puller()',
      'nenhum job ONVIF agendado');
  ELSE
    SELECT string_agg(j.jobname, ', ') INTO v FROM cron.job j
     WHERE j.jobname ILIKE '%onvif%'
       AND position('invoke_onvif_event_puller' IN j.command) = 0;
    IF v IS NOT NULL THEN
      INSERT INTO _resultado VALUES (15, 'job do ONVIF chama invoke_onvif_event_puller()', v);
    END IF;
  END IF;

  -- 16. Todo job dos 14 dispara por net.http_post.
  SELECT string_agg(j.jobname, ', ' ORDER BY j.jobname) INTO v
    FROM cron.job j JOIN _esperado e ON e.jobname = j.jobname
   WHERE position('net.http_post' IN j.command) = 0;
  IF v IS NOT NULL THEN
    INSERT INTO _resultado VALUES (16, 'comando dispara por net.http_post', v);
  END IF;
END
$suite$;

DO $veredito$
DECLARE
  v_total int;
  v_detalhe text;
BEGIN
  SELECT count(*), string_agg(format('  [%s] %s: %s', n, descricao, detalhe), E'\n' ORDER BY n)
    INTO v_total, v_detalhe
    FROM _resultado;
  IF v_total > 0 THEN
    RAISE EXCEPTION E'Suite dos comandos do cron reprovada (% falhas):\n%', v_total, v_detalhe;
  END IF;
  RAISE NOTICE 'OK: checagens dos comandos do cron';
END
$veredito$;

ROLLBACK;
