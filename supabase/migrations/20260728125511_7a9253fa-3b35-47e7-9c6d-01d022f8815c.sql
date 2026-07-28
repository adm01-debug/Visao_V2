-- Onda 188 — Fechar exposição residual a `anon` nas tabelas de visualizações favoritas.
REVOKE ALL ON TABLE public.monitor_groups FROM anon;
REVOKE ALL ON TABLE public.monitor_group_cameras FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.monitor_group_cameras TO authenticated;
GRANT ALL ON public.monitor_groups TO service_role;
GRANT ALL ON public.monitor_group_cameras TO service_role;