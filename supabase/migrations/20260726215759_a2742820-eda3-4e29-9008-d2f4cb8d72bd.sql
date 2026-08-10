-- Onda 136 — blindagem das tabelas do barramento de manutenção.
-- Os default privileges do papel `postgres` concederam arwdDxtm a anon e a
-- authenticated. RLS ainda barra a leitura anônima (as policies são TO
-- authenticated), mas manter GRANT de escrita para papéis que nenhuma policy
-- autoriza é superfície morta: qualquer policy futura mal escrita viraria
-- escrita direta na trilha de incidentes.

REVOKE ALL ON public.maintenance_alert_events FROM anon;
REVOKE ALL ON public.maintenance_alert_escalations FROM anon;
REVOKE ALL ON public.maintenance_alert_dispatches FROM anon;

REVOKE ALL ON public.maintenance_alert_events FROM authenticated;
REVOKE ALL ON public.maintenance_alert_escalations FROM authenticated;
REVOKE ALL ON public.maintenance_alert_dispatches FROM authenticated;

-- Leitura apenas; a policy existente ainda exige has_role(admin).
GRANT SELECT ON public.maintenance_alert_events TO authenticated;
GRANT SELECT ON public.maintenance_alert_escalations TO authenticated;
GRANT SELECT ON public.maintenance_alert_dispatches TO authenticated;

GRANT ALL ON public.maintenance_alert_events TO service_role;
GRANT ALL ON public.maintenance_alert_escalations TO service_role;
GRANT ALL ON public.maintenance_alert_dispatches TO service_role;

-- O reconhecimento continua sendo o único caminho de escrita para humanos,
-- e ele já valida o papel dentro da função (SECURITY DEFINER).
REVOKE ALL ON FUNCTION public.acknowledge_maintenance_alert(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_maintenance_alert(uuid) TO authenticated;