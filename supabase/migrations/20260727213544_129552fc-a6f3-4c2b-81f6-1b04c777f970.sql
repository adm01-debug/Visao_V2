-- Onda 154 — auto-gate da rotina de elegibilidade.
--
-- A versão anterior confiava nos argumentos: quem conhecesse camera_id e
-- user_id alheios leria o token da porta. Token de relé não é segredo grave,
-- mas é topologia de alarme de outra pessoa — e o padrão do projeto é que
-- SECURITY DEFINER SEMPRE se auto-limita, nunca confia no chamador.
CREATE OR REPLACE FUNCTION public.rule_eligible_io_port(
  p_camera_id uuid,
  p_user_id uuid,
  p_now timestamptz DEFAULT now()
)
RETURNS TABLE (
  port_id uuid,
  port_token text,
  pulse_ms integer,
  min_interval_ms integer,
  cooldown_remaining_ms integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.port_token,
    p.pulse_ms,
    p.min_interval_ms,
    GREATEST(
      0,
      p.min_interval_ms - COALESCE(
        EXTRACT(EPOCH FROM (p_now - p.last_actuated_at)) * 1000,
        p.min_interval_ms
      )
    )::integer
  FROM public.camera_io_ports p
  WHERE p.camera_id = p_camera_id
    AND p.user_id = p_user_id
    AND p.direction = 'output'
    AND p.enabled = true
    -- auto-gate: chamador é o dono, é admin, ou é o serviço interno (sem JWT)
    AND (
      auth.uid() = p_user_id
      OR public.has_role(auth.uid(), 'admin')
      OR auth.uid() IS NULL
    )
  ORDER BY p.port_token
  LIMIT 1;
$$;