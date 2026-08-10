SELECT
  count(*) AS total_rows,
  count(user_id) AS with_user_id
FROM public.notification_configs;