-- Automações agendadas voltam a falar com o projeto Supabase certo.
--
-- Contexto: os 14 jobs de `cron.job` que chamam edge functions nasceram com a
-- URL e a chave anon de um projeto Supabase que não existe mais
-- (`fsisdfdwlbfeadwfqpir`). O sintoma era silencioso: o pg_cron marcava cada
-- execução como "succeeded" porque disparar o HTTP deu certo; do outro lado,
-- `net._http_response` guardava "Couldn't resolve host name" e ninguém lia. Na
-- prática, TODA a automação agendada estava parada — saúde de stream, watchdog
-- do cron, dispatch do centro de monitoramento, tiering de storage, alerta de
-- CSP, monitor de restore e o coletor ONVIF.
--
-- Correção: a URL passa a sair de `edge_function_url()` e o `apikey` de um
-- segredo interno (`internal_cron_secrets.cron_anon_key`), nunca mais de texto
-- literal no comando do job. Trocar de projeto Supabase no futuro é atualizar um
-- parâmetro, não reescrever 14 comandos.
--
-- De onde vem a URL (nesta ordem):
--   1. `app.settings.supabase_url` (GUC do banco);
--   2. `public.internal_cron_secrets`, chave `supabase_url`.
-- Sem nenhuma das duas, `edge_function_url()` devolve NULL e o bloco de
-- agendamento NÃO toca nos jobs. Antes havia fallback literal para o host de
-- produção e um banco de teste sem configuração instalava cron apontando para
-- produção — um disparo de teste gravava em produção.
--
-- Sem `cron_anon_key`, `edge_function_cron_headers()` devolve só o
-- Content-Type: as funções com `verify_jwt = false` seguem funcionando e as
-- demais respondem 401 — falha visível em `net._http_response`, ao contrário do
-- silêncio anterior.
--
-- Nenhum segredo aparece no texto de `cron.job.command`: o comando cita a
-- funcao pelo nome e os headers extras (x-cron-secret do CSP, x-orchestrator do
-- tiering) saem de `edge_function_cron_extra_headers()` em tempo de execucao.
--
-- Segredos que cada ambiente cadastra em `public.internal_cron_secrets` (nenhum
-- valor vive nesta migration):
--   cron_anon_key     → apikey das funções com verify_jwt = true;
--   supabase_url      → URL do projeto quando não há GUC `app.settings.supabase_url`;
--   retention_secret  → mesmo valor de RETENTION_SECRET da função csp-anomaly-notify;
--                       sem ele o job do CSP sai sem `x-cron-secret` (401 quando a
--                       função tem RETENTION_SECRET definido).
--
-- Histórico: uma versão anterior desta migration (com fallback literal para o
-- projeto vivo) já foi aplicada em produção em 2026-11-27. Esta versão troca o
-- fallback por configuração e é idempotente: reaplicar apenas reescreve os
-- comandos.

BEGIN;

CREATE OR REPLACE FUNCTION public.edge_function_url(_function text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT coalesce(
    nullif(current_setting('app.settings.supabase_url', true), ''),
    (SELECT secret FROM public.internal_cron_secrets WHERE name = 'supabase_url')
  ) || '/functions/v1/' || _function
$function$;

CREATE OR REPLACE FUNCTION public.edge_function_cron_headers()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$ SELECT jsonb_build_object('Content-Type', 'application/json') || CASE WHEN coalesce(_k.secret, '') <> '' THEN jsonb_build_object('apikey', _k.secret, 'Authorization', 'Bearer ' || _k.secret) ELSE '{}'::jsonb END FROM (SELECT secret FROM public.internal_cron_secrets WHERE name = 'cron_anon_key') AS _k RIGHT JOIN (SELECT 1) AS _dummy ON true $function$;

revoke all on function public.edge_function_url(text) from PUBLIC, anon, authenticated;
revoke all on function public.edge_function_cron_headers() from PUBLIC, anon, authenticated;

comment on function public.edge_function_url(text) is
  'URL de uma edge function do projeto corrente (app.settings.supabase_url ou internal_cron_secrets.supabase_url); NULL sem configuracao.';
comment on function public.edge_function_cron_headers() is
  'Cabecalhos das chamadas do pg_cron as edge functions; apikey vem de internal_cron_secrets.cron_anon_key.';

-- Headers extras por funcao, resolvidos em tempo de EXECUCAO.
--
-- Motivo: `cron.job.command` e legivel por qualquer administrador do banco (e
-- aparece no painel do Supabase). Embutir o `retention_secret` no texto do
-- comando colocava a credencial da limpeza de retencao em texto claro no
-- historico do agendador. Aqui o comando guarda apenas o NOME da funcao e o
-- segredo sai de `internal_cron_secrets` no momento da chamada.
CREATE OR REPLACE FUNCTION public.edge_function_cron_extra_headers(_function text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT case
    -- O orquestrador de tiering recusa a chamada (401 {"error":"unauthorized"})
    -- sem o cabecalho x-orchestrator: 1, porque o cron manda o anon key e ele
    -- so aceita admin JWT ou esse header. E o unico job que leva esse header.
    when _function = 'storage-tiering-orchestrator' then '{"x-orchestrator":"1"}'::jsonb
    -- O notificador de CSP rejeita com 401 quando RETENTION_SECRET esta definido
    -- na funcao e o header x-cron-secret nao bate. Sem o cadastro do segredo o
    -- job sai sem o header e o 401 fica visivel em net._http_response.
    when _function = 'csp-anomaly-notify' then coalesce(
      (select jsonb_build_object('x-cron-secret', secret)
         from public.internal_cron_secrets where name = 'retention_secret'),
      '{}'::jsonb
    )
    else '{}'::jsonb
  end
$function$;

revoke all on function public.edge_function_cron_extra_headers(text) from PUBLIC, anon, authenticated;

comment on function public.edge_function_cron_extra_headers(text) is
  'Headers extras por edge function no pg_cron; segredos vem de internal_cron_secrets, nunca do comando do job.';

-- Avisos de configuração ausente: nada aqui contém segredo, cada ambiente
-- cadastra o seu.
do $aviso$
begin
  if not exists (select 1 from public.internal_cron_secrets where name = 'cron_anon_key') then
    raise notice 'internal_cron_secrets.cron_anon_key ausente: funcoes com verify_jwt = true responderao 401';
  end if;
  if not exists (select 1 from public.internal_cron_secrets where name = 'retention_secret') then
    raise notice 'internal_cron_secrets.retention_secret ausente: o job do CSP sai sem x-cron-secret';
  end if;
end
$aviso$;

-- Reagenda os jobs preservando nome e expressão cron originais. Idempotente:
-- rodar de novo apenas reescreve o comando com a URL correta.
do $jobs$
declare
  j record;
begin
  if public.edge_function_url('') is null then
    raise warning 'sem URL de projeto (app.settings.supabase_url ou internal_cron_secrets.supabase_url): jobs NAO reagendados';
    return;
  end if;

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
      -- O comando guarda apenas o NOME da funcao: os headers extras (inclusive o
      -- x-cron-secret) sao resolvidos por `edge_function_cron_extra_headers()` em
      -- tempo de execucao, para o segredo nao ficar em texto claro em cron.job.
      format(
        'SELECT net.http_post(url := public.edge_function_url(%L), headers := public.edge_function_cron_headers() || public.edge_function_cron_extra_headers(%L), body := ''{}''::jsonb, timeout_milliseconds := 20000)',
        j.fn,
        j.fn
      )
    );
  end loop;
end
$jobs$;

-- O coletor ONVIF é o único job autenticado por segredo próprio: mantém o
-- x-internal-secret e passa a mandar também o apikey, sem o qual o gateway
-- recusa a chamada antes de a função rodar. O corpo não usa nada de
-- `extensions`, então o schema sai do search_path de uma função SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.invoke_onvif_event_puller()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
  IF v_url IS NULL THEN
    RAISE WARNING 'sem URL de projeto configurada; chamada abortada';
    RETURN;
  END IF;

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

-- ROLLBACK: executar manualmente, fora de transação, nesta ordem.
--
-- 1) Devolver os 14 jobs ao comando anterior. O comando de cada um está no
--    histórico das migrations que o criou; o formato era este
--    (supabase/migrations/20260722160517_e09ef3b9-cf60-4380-9b63-be6b03f1da08.sql:42-49):
--      SELECT cron.schedule('camera_health_monitor_every_3m', '*/3 * * * *', $$
--        SELECT net.http_post(
--          url := 'https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/camera-health-monitor',
--          headers := '{"Content-Type":"application/json","apikey":"<anon key do projeto morto>"}'::jsonb,
--          body := '{}'::jsonb,
--          timeout_milliseconds := 20000);
--      $$);
--    Repetir para os 14 (nome, expressão e função estão no bloco $jobs$ acima;
--    `rtsp-revalidate-scheduler-every-minute`, `vault-coverage-watchdog` e
--    `glacier-stuck-monitor-15min` vieram de outras migrations, com o mesmo
--    formato de URL literal). O comando literal só serve para diagnóstico:
--    `fsisdfdwlbfeadwfqpir` não existe mais. Para voltar a automação ao ar sem
--    os helpers, recadastre os segredos e reescreva os comandos com a URL atual.
--
-- 2) Restaurar `public.invoke_onvif_event_puller()` na definição anterior
--    (supabase/migrations/20260727215240_50209121-e802-4bef-8614-73ef9d70c854.sql:26-58),
--    que montava a URL sozinha e mandava apenas o x-internal-secret — e, ao
--    restaurar, REAPLICAR o REVOKE (sem ele a função volta a ser executável por
--    anon):
--      REVOKE ALL ON FUNCTION public.invoke_onvif_event_puller() FROM PUBLIC, anon, authenticated;
--      GRANT EXECUTE ON FUNCTION public.invoke_onvif_event_puller() TO service_role;
--
-- 3) Dropar os helpers criados aqui (depois dos passos 1 e 2):
--      DROP FUNCTION IF EXISTS public.edge_function_cron_extra_headers(text);
--      DROP FUNCTION IF EXISTS public.edge_function_cron_headers();
--      DROP FUNCTION IF EXISTS public.edge_function_url(text);
--
-- ATENÇÃO: sem o passo 1, o passo 3 deixa os 14 comandos chamando uma função
-- inexistente e a automação agendada para inteira.

COMMIT;
