-- Os default privileges do papel `postgres` concedem tudo a `authenticated`;
-- REVOKE explícito é a única forma de fechar a escrita direta pela API.
REVOKE ALL ON public.collab_notifications FROM authenticated, anon;
REVOKE ALL ON public.collab_notification_reads FROM authenticated, anon;

GRANT SELECT ON public.collab_notifications TO authenticated;
GRANT SELECT ON public.collab_notification_reads TO authenticated;

-- Garante que futuras concessões padrão não reabram a porta nestas tabelas.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;