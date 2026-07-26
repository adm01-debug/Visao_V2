-- Onda 141 — corrige a chamada quebrada do árbitro de auto-cura.
--
-- `heal_local_agents()` passa `count(*)` (bigint) ao árbitro, cuja assinatura
-- só aceita `integer`. Postgres não faz downcast implícito bigint→integer na
-- resolução de funções, então a chamada levanta
-- `function ... does not exist`, o bloco EXCEPTION da rotina engole o erro e a
-- varredura termina com `ok=false` — silenciosamente, sem curar ninguém.
--
-- Optamos por uma SOBRECARGA aditiva em vez de alterar a assinatura existente:
-- trocar o tipo exigiria DROP + CREATE do árbitro, invalidando temporariamente
-- qualquer outro chamador e qualquer gate que valide a assinatura atual. A
-- sobrecarga delega para a versão canônica — há uma única regra de decisão,
-- em um único lugar.
CREATE OR REPLACE FUNCTION public.arbitrate_agent_healing(
  healing_action       text,
  healing_severity     text,
  redelivery_severity  text,
  deliveries           bigint,
  external_root_cause  boolean
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- O clamp evita que uma contagem absurda (ou negativa, por defeito futuro)
  -- estoure o int4 no downcast e transforme um erro de dado em erro fatal.
  SELECT public.arbitrate_agent_healing(
    healing_action,
    healing_severity,
    redelivery_severity,
    LEAST(GREATEST(COALESCE(deliveries, 0), 0), 2147483647)::int,
    external_root_cause
  );
$$;

REVOKE ALL ON FUNCTION public.arbitrate_agent_healing(text, text, text, bigint, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.arbitrate_agent_healing(text, text, text, bigint, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.arbitrate_agent_healing(text, text, text, bigint, boolean) TO service_role;

COMMENT ON FUNCTION public.arbitrate_agent_healing(text, text, text, bigint, boolean) IS
  'Onda 141: sobrecarga bigint do árbitro. heal_local_agents() passa count(*) (bigint); sem esta variante a resolução de função falha e a varredura inteira é abortada com ok=false.';