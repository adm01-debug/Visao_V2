-- Onda 155 — agendamento autenticado do coletor de eventos ONVIF.
--
-- O cron do banco não porta a chave de serviço, e deixar a função de borda
-- aberta seria dar a qualquer um um martelo para bater nas câmeras. Guardamos
-- então um segredo próprio, legível só por service_role, e o cron o apresenta.

CREATE TABLE IF NOT EXISTS public.internal_cron_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.internal_cron_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.internal_cron_secrets TO service_role;
ALTER TABLE public.internal_cron_secrets ENABLE ROW LEVEL SECURITY;

-- Sem política para authenticated/anon: o silêncio aqui é a política.
DROP POLICY IF EXISTS "internal_cron_secrets_service_all" ON public.internal_cron_secrets;
CREATE POLICY "internal_cron_secrets_service_all" ON public.internal_cron_secrets
  FOR ALL TO service_role USING (true) WITH CHECK (true);

INSERT INTO public.internal_cron_secrets (name, secret)
VALUES ('onvif_event_puller', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.invoke_onvif_event_puller()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
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

  v_url := coalesce(
    current_setting('app.settings.supabase_url', true),
    'https://fsisdfdwlbfeadwfqpir.supabase.co'
  ) || '/functions/v1/onvif-event-puller';

  PERFORM net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-internal-secret', v_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 50000
  );
END;
$$;

REVOKE ALL ON FUNCTION public.invoke_onvif_event_puller() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname = 'onvif-event-puller-minutely';
  PERFORM cron.schedule(
    'onvif-event-puller-minutely',
    '* * * * *',
    $cron$SELECT public.invoke_onvif_event_puller();$cron$
  );
END $$;