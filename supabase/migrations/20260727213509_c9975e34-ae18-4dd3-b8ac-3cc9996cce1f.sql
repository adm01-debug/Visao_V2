-- Onda 154 · etapa 6 — ação de I/O no motor de regras.
--
-- ALTER TYPE ... ADD VALUE é irreversível e não pode ser usado na mesma
-- transação que o consome; por isso a rotina abaixo recebe o valor por texto.
ALTER TYPE public.rule_action ADD VALUE IF NOT EXISTS 'trigger_output';

-- Escolha da porta elegível para uma regra.
--
-- Por que no banco e não na função de borda: a regra roda no servidor sem
-- sessão de usuário, e precisamos do MESMO critério de elegibilidade em
-- qualquer origem. Deixar o critério só no TypeScript criaria uma segunda
-- verdade sobre "qual saída a regra aciona" — e alarme físico não comporta
-- duas verdades.
--
-- SECURITY DEFINER com auto-gate estrito: devolve exclusivamente portas da
-- câmera informada E do dono informado. Nunca atravessa contas.
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
  ORDER BY p.port_token
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.rule_eligible_io_port(uuid, uuid, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rule_eligible_io_port(uuid, uuid, timestamptz) TO authenticated, service_role;

COMMENT ON FUNCTION public.rule_eligible_io_port(uuid, uuid, timestamptz) IS
  'Onda 154: porta de saída elegível para acionamento por regra, com folga de cooldown já calculada.';