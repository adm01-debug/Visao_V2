SELECT cron.unschedule('evaluate-abandoned-episode-alerts')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'evaluate-abandoned-episode-alerts');

SELECT cron.schedule(
  'evaluate-abandoned-episode-alerts',
  '19 * * * *',
  $cron$SELECT public.evaluate_abandoned_episode_alerts();$cron$
);
