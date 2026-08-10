-- Onda 107.1 — o job mensal legado (0 2 1 * *, months_ahead=3) é redundante e
-- estritamente pior que o diário (17 3 * * *, months_ahead=6): roda 1x/mês e,
-- se falhar naquele dia, a cobertura fica 30 dias sem reconvergir.
DO $cron$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'visao-monthly-partitions') THEN
    PERFORM cron.unschedule('visao-monthly-partitions');
  END IF;
END;
$cron$;