-- Os default privileges do papel `postgres` já haviam concedido TUDO a
-- `authenticated` (arwdDxtm). A ausência de policy de UPDATE/DELETE e o gatilho
-- de imutabilidade já barravam a edição, mas defesa em profundidade exige que o
-- privilégio simplesmente não exista.
REVOKE ALL ON public.evidence_exports FROM authenticated;
REVOKE ALL ON public.evidence_exports FROM anon;
GRANT SELECT, INSERT ON public.evidence_exports TO authenticated;
GRANT ALL ON public.evidence_exports TO service_role;