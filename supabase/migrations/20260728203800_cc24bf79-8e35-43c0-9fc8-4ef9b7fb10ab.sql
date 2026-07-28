-- Onda 225 — a rotina de autoteste é ferramenta de diagnóstico, não API.
-- Default privileges do papel dono concedem EXECUTE a `authenticated`; sem o
-- REVOKE explícito, uma função SECURITY DEFINER fica exposta a qualquer sessão
-- logada (mesma lição das tabelas: default privileges abrem sozinhos).
REVOKE ALL ON FUNCTION public.alarm_armed_state_selftest() FROM authenticated;
REVOKE ALL ON FUNCTION public.alarm_armed_state_selftest() FROM anon;
REVOKE ALL ON FUNCTION public.alarm_armed_state_selftest() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.alarm_armed_state_selftest() TO service_role;