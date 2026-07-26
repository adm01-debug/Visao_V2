-- Onda 124 — correção: privilégios padrão do papel postgres reconcedem tudo a
-- anon/authenticated. É preciso revogar nominalmente, não apenas de PUBLIC.

REVOKE ALL ON FUNCTION public.authorize_ingest_publish(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_ingest_publish(text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.mark_ingest_unpublish(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_ingest_unpublish(text) TO service_role;

REVOKE ALL ON FUNCTION public.detect_stale_ingest_publishers()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.detect_stale_ingest_publishers() TO service_role;

REVOKE ALL ON FUNCTION public.generate_ingest_stream_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_ingest_stream_key() TO authenticated, service_role;

-- Tabela: manter apenas o CRUD do dono; nada de TRUNCATE/TRIGGER/REFERENCES.
REVOKE ALL ON public.camera_ingest_endpoints FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_ingest_endpoints TO authenticated;
GRANT ALL ON public.camera_ingest_endpoints TO service_role;