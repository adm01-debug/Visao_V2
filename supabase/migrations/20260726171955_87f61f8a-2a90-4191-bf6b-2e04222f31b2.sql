-- Os privilégios padrão do papel `postgres` concedem tudo a `anon` em tabelas
-- novas. A RLS já bloqueava as linhas, mas o GRANT residual viola o princípio
-- de menor privilégio e mascara auditorias. Removido explicitamente.
REVOKE ALL ON public.root_cause_correlation_runs FROM anon;
REVOKE ALL ON public.agent_healing_runs FROM anon;
REVOKE ALL ON public.agent_healing_actions FROM anon;

GRANT SELECT ON public.root_cause_correlation_runs TO authenticated;
GRANT SELECT ON public.agent_healing_runs TO authenticated;
GRANT SELECT ON public.agent_healing_actions TO authenticated;

GRANT ALL ON public.root_cause_correlation_runs TO service_role;
GRANT ALL ON public.agent_healing_runs TO service_role;
GRANT ALL ON public.agent_healing_actions TO service_role;