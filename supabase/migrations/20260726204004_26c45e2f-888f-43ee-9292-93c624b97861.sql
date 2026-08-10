-- Os default privileges concedem EXECUTE a authenticated em toda função nova.
-- Conferir uma placa contra a rede é oráculo: com ela, qualquer usuário logado
-- testaria placas em lote e descobriria o que os vizinhos marcaram.
REVOKE ALL ON FUNCTION public.match_collab_plate(uuid, uuid, text, numeric, uuid, timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_collab_plate(uuid, uuid, text, numeric, uuid, timestamptz)
  TO service_role;

REVOKE ALL ON FUNCTION public.collab_plate_hash(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collab_plate_hash(uuid, text) TO service_role;