-- ============================================================================
-- Onda 119 — Integridade temporal da fila de relay
--
-- Contexto: a Onda 118 introduziu `scheduled_at` (jitter de até 540s) para
-- evitar tempestades de reinício. O TTL, porém, continuava ancorado em now(),
-- não em scheduled_at. Uma tarefa jitterada com TTL curto expiraria antes de
-- ficar elegível — e a Onda 115 conta expiradas como prova de surdez do
-- agente. Laço de realimentação: TTL curto -> "agente surdo" -> reinício ->
-- nova tarefa jitterada -> expira de novo.
--
-- Espelha src/lib/relayTaskWindow.ts. Alterou lá, altere aqui.
-- ============================================================================

-- 1) Normalização na escrita -------------------------------------------------
-- Corrigimos em vez de rejeitar: um INSERT recusado dentro de
-- heal_local_agents abortaria a varredura inteira e deixaria a frota sem
-- tratamento — falha bem pior do que um TTL esticado.
CREATE OR REPLACE FUNCTION public.normalize_agent_relay_task_window()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  min_window constant interval := interval '60 seconds';   -- minWindowSeconds
  max_window constant interval := interval '3600 seconds'; -- maxWindowSeconds
BEGIN
  IF NEW.scheduled_at IS NULL THEN
    NEW.scheduled_at := now();
  END IF;

  IF NEW.expires_at IS NULL OR NEW.expires_at < NEW.scheduled_at + min_window THEN
    NEW.expires_at := NEW.scheduled_at + min_window;
  ELSIF NEW.expires_at > NEW.scheduled_at + max_window THEN
    NEW.expires_at := NEW.scheduled_at + max_window;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_agent_relay_task_window() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS trg_normalize_agent_relay_task_window ON public.agent_relay_tasks;
CREATE TRIGGER trg_normalize_agent_relay_task_window
  BEFORE INSERT OR UPDATE OF scheduled_at, expires_at ON public.agent_relay_tasks
  FOR EACH ROW EXECUTE FUNCTION public.normalize_agent_relay_task_window();

-- 2) Invariante declarada ----------------------------------------------------
-- O trigger garante >= 60s; a CHECK documenta e defende o mínimo absoluto
-- contra qualquer caminho futuro que desative o trigger.
ALTER TABLE public.agent_relay_tasks
  DROP CONSTRAINT IF EXISTS agent_relay_tasks_delivery_window_positive;
ALTER TABLE public.agent_relay_tasks
  ADD CONSTRAINT agent_relay_tasks_delivery_window_positive
  CHECK (expires_at > scheduled_at);

-- 3) Índice de elegibilidade -------------------------------------------------
-- claim_agent_relay_tasks filtra por agente + status + janela; sem isto o
-- polling da frota inteira vira seq scan a cada poucos segundos.
CREATE INDEX IF NOT EXISTS idx_agent_relay_tasks_claimable
  ON public.agent_relay_tasks (agent_id, scheduled_at)
  WHERE status = 'pending';

-- 4) Expiração com causa ------------------------------------------------------
-- Três causas exigem três reações. Janela injusta é bug nosso; não
-- reivindicada é agente surdo; reivindicada sem resposta é agente vivo porém
-- travado — e só este último tem chance real de ser resolvido por reinício.
CREATE OR REPLACE FUNCTION public.expire_agent_relay_tasks()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH expired AS (
    UPDATE public.agent_relay_tasks
       SET status = 'expired',
           completed_at = now(),
           error = COALESCE(
             error,
             CASE
               WHEN (expires_at - scheduled_at) < interval '60 seconds'
                 THEN 'task_expired_unfair_window'
               WHEN claimed_at IS NULL
                 THEN 'task_expired_unclaimed'
               ELSE 'task_expired_no_response'
             END)
     WHERE status IN ('pending','in_progress')
       AND expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::int FROM expired;
$$;

REVOKE ALL ON FUNCTION public.expire_agent_relay_tasks() FROM PUBLIC, anon;

COMMENT ON CONSTRAINT agent_relay_tasks_delivery_window_positive ON public.agent_relay_tasks IS
  'Onda 119: janela de entrega estritamente positiva; impede tarefa morta ao nascer.';
