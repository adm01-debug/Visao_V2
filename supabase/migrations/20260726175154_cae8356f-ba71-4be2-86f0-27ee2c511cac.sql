-- ============================================================================
-- Onda 119b — o diagnóstico de surdez passa a exigir janela justa.
--
-- Reescrita cirúrgica de public.heal_local_agents(): trocamos apenas o
-- contador `expired` do LATERAL de diagnóstico. Fazemos por substituição
-- verificada sobre a definição vigente (em vez de recolar as ~345 linhas da
-- rotina) para eliminar o risco de reintroduzir por engano uma versão antiga
-- de qualquer outro trecho. A substituição é abortada se o alvo não for
-- encontrado exatamente uma vez.
-- ============================================================================
DO $migration$
DECLARE
  cur_def   text;
  new_def   text;
  old_snip  constant text :=
    E'count(*) FILTER (WHERE r.status = ''expired''\n                                 OR (r.status = ''pending'' AND r.expires_at < now())) AS expired';
  new_snip  constant text :=
    E'-- Onda 119: só conta como surdez a tarefa que teve janela justa\n'
    '             -- (>= 60s entre scheduled_at e expires_at). Culpar o agente por\n'
    '             -- uma janela que nós mesmos encurtamos gera reinício indevido.\n'
    '             count(*) FILTER (WHERE (r.status = ''expired''\n'
    '                                     OR (r.status = ''pending'' AND r.expires_at < now()))\n'
    '                                AND (r.expires_at - r.scheduled_at) >= interval ''60 seconds''\n'
    '                                AND COALESCE(r.error, '''') <> ''task_expired_unfair_window'') AS expired';
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO cur_def
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents';

  IF cur_def IS NULL THEN
    RAISE EXCEPTION 'heal_local_agents() não encontrada — migração abortada';
  END IF;

  IF position(old_snip IN cur_def) = 0 THEN
    IF position('task_expired_unfair_window' IN cur_def) > 0 THEN
      RAISE NOTICE 'Onda 119b já aplicada; nada a fazer.';
      RETURN;
    END IF;
    RAISE EXCEPTION 'Trecho alvo do contador `expired` não encontrado — migração abortada para não corromper a rotina';
  END IF;

  new_def := replace(cur_def, old_snip, new_snip);

  IF new_def = cur_def OR position('task_expired_unfair_window' IN new_def) = 0 THEN
    RAISE EXCEPTION 'Substituição não produziu efeito — migração abortada';
  END IF;

  EXECUTE new_def;
END;
$migration$;

-- Verificação pós-condição: a rotina precisa estar compilada com a regra nova
-- e continuar blindada (SECURITY DEFINER com search_path fixo).
DO $verify$
DECLARE
  d text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO d
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'heal_local_agents';

  IF position('task_expired_unfair_window' IN d) = 0 THEN
    RAISE EXCEPTION 'Pós-condição falhou: regra de janela justa ausente';
  END IF;
  IF position('SET search_path' IN d) = 0 THEN
    RAISE EXCEPTION 'Pós-condição falhou: search_path não fixado';
  END IF;
END;
$verify$;
