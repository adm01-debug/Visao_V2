-- Automações agendadas voltam a falar com o projeto Supabase certo.
--
-- Contexto: os 14 jobs de `cron.job` que chamam edge functions nasceram com a
-- URL e a chave anon de um projeto Supabase que não existe mais. O sintoma era
-- silencioso: o pg_cron marcava cada execução como "succeeded" porque disparar o
-- HTTP deu certo; do outro lado, `net._http_response` guardava "Couldn't resolve
-- host name" e ninguém lia. Na prática, TODA a automação agendada estava parada
-- — saúde de stream, watchdog do cron, dispatch do centro de monitoramento,
-- tiering de storage, alerta de CSP, monitor de restore e o coletor ONVIF.
--
-- Correção: a URL passa a sair de `edge_function_url()` e o `apikey` de um
-- segredo interno (`internal_cron_secrets.cron_anon_key`), nunca mais de texto
-- literal no comando do job. Trocar de projeto Supabase no futuro é atualizar um
-- parâmetro, não reescrever 14 comandos.
--
-- Sem `cron_anon_key`, `edge_function_cron_headers()` devolve só o
-- Content-Type: as funções com `verify_jwt = false` seguem funcionando e as
-- demais respondem 401 — falha visível em `net._http_response`, ao contrário do
-- silêncio anterior.

BEGIN;

CREATE OR REPLACE FUNCTION public.edge_function_url(_function text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT coalesce(nullif(current_setting('app.settings.supabase_url', true), ''), 'https://pmzxbffnbenkmzpnbehb.supabase.co') || '/functions/v1/' || _function $function$;

CREATE OR REPLACE FUNCTION public.edge_function_cron_headers()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('Content-Type', 'application/json') || CASE WHEN coalesce(_k.secret, '') <> '' THEN jsonb_build_object('apikey', _k.secret, 'Authorization', 'Bearer ' || _k.secret) ELSE '{}'::jsonb END FROM (SELECT secret FROM public.internal_cron_secrets WHERE name = 'cron_anon_key') AS _k RIGHT JOIN (SELECT 1) AS _dummy ON true $function$;

revoke all on function public.edge_function_url(text) from PUBLIC, anon, authenticated;
revoke all on function public.edge_function_cron_headers() from PUBLIC, anon, authenticated;

comment on function public.edge_function_url(text) is
  'URL de uma edge function do projeto corrente (app.settings.supabase_url ou projeto vivo).';
comment on function public.edge_function_cron_headers() is
  'Cabecalhos das chamadas do pg_cron as edge functions; apikey vem de internal_cron_secrets.cron_anon_key.';

-- O segredo não vive na migration: cada ambiente cadastra o seu. Sem ele, as
-- funções com verify_jwt = true respondem 401 — por isso o aviso.
do $aviso$
begin
  if not exists (select 1 from public.internal_cron_secrets where name = 'cron_anon_key') then
    raise notice 'internal_cron_secrets.cron_anon_key ausente: funcoes com verify_jwt = true responderao 401';
  end if;
end
$aviso$;

-- Reagenda os jobs preservando nome e expressão cron originais. Idempotente:
-- rodar de novo apenas reescreve o comando com a URL correta.
do $jobs$
declare
  j record;
begin
  for j in
    select * from (values
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
      ('vault-coverage-watchdog', '*/15 * * * *', 'vault-coverage-watchdog')
    ) as t(jobname, sched, fn)
  loop
    if exists (select 1 from cron.job where jobname = j.jobname) then
      perform cron.unschedule(j.jobname);
    end if;
    perform cron.schedule(
      j.jobname,
      j.sched,
      format(
        'SELECT net.http_post(url := public.edge_function_url(%L), headers := public.edge_function_cron_headers(), body := ''{}''::jsonb, timeout_milliseconds := 20000)',
        j.fn
      )
    );
  end loop;
end
$jobs$;

-- O coletor ONVIF é o único job autenticado por segredo próprio: mantém o
-- x-internal-secret e passa a mandar também o apikey, sem o qual o gateway
-- recusa a chamada antes de a função rodar.
CREATE OR REPLACE FUNCTION public.invoke_onvif_event_puller()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_secret text;
  v_url text;
BEGIN
  SELECT secret INTO v_secret
    FROM public.internal_cron_secrets WHERE name = 'onvif_event_puller';
  IF v_secret IS NULL THEN
    RAISE WARNING 'segredo do coletor ONVIF ausente; chamada abortada';
    RETURN;
  END IF;

  v_url := public.edge_function_url('onvif-event-puller');

  PERFORM net.http_post(
    url     := v_url,
    headers := public.edge_function_cron_headers() || jsonb_build_object('x-internal-secret', v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 50000
  );
END;
$function$;

-- Recriada por outros agentes, a função perdeu o REVOKE declarado em
-- 20260727215240 e voltou a ser EXECUTE para PUBLIC (o default do Postgres) —
-- ou seja, qualquer visitante anônimo podia disparar o coletor ONVIF via RPC.
REVOKE ALL ON FUNCTION public.invoke_onvif_event_puller() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.invoke_onvif_event_puller() TO service_role;

-- ROLLBACK:
--   Devolve os 14 jobs ao comando anterior (URL literal do projeto morto) e
--   remove os helpers criados aqui:
--     SELECT cron.unschedule(jobname) FROM cron.job
--      WHERE jobname IN ('camera_health_monitor_every_3m',
--        'connectivity-resolution-alert-hourly','cron-watchdog-30m',
--        'cron-watchdog-escalate-30m','maintenance-alerts-dispatch-hourly',
--        'preview-telemetry-alert-15min','rtsp-revalidate-scheduler-every-minute',
--        'stream_health_probe_every_2m','visao-csp-anomaly-notify',
--        'watchdog-ack-sla-alert-hourly','monitoring-center-dispatch-every-minute',
--        'glacier-stuck-monitor-15min','storage-tiering-orchestrator-15min',
--        'vault-coverage-watchdog');
--     DROP FUNCTION IF EXISTS public.invoke_onvif_event_puller();
--     DROP FUNCTION IF EXISTS public.edge_function_cron_headers();
--     DROP FUNCTION IF EXISTS public.edge_function_url(text);
--   (os jobs só voltam ao ar com o comando antigo; sem isso a automação
--   agendada continua parada — o rollback é pior que manter a correção.)

COMMIT;
