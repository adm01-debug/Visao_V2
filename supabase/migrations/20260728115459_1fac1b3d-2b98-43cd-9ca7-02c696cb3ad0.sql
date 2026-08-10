-- 1. Procedência do encerramento -----------------------------------------
ALTER TABLE public.alarm_recurrence_episodes
  ADD COLUMN IF NOT EXISTS close_source text NOT NULL DEFAULT 'observed';

ALTER TABLE public.alarm_recurrence_episodes
  DROP CONSTRAINT IF EXISTS alarm_recurrence_close_source_check;

ALTER TABLE public.alarm_recurrence_episodes
  ADD CONSTRAINT alarm_recurrence_close_source_check
  CHECK (close_source IN ('observed', 'reconciled'));

-- Episódio aberto jamais carrega procedência de fechamento.
ALTER TABLE public.alarm_recurrence_episodes
  DROP CONSTRAINT IF EXISTS alarm_recurrence_close_source_shape;

ALTER TABLE public.alarm_recurrence_episodes
  ADD CONSTRAINT alarm_recurrence_close_source_shape
  CHECK (closed_at IS NOT NULL OR close_source = 'observed');

COMMENT ON COLUMN public.alarm_recurrence_episodes.close_source IS
  'observed = duração medida; reconciled = fechado retroativamente no corte declarado (Onda 187). Duração de reconciliado é convenção, não medição.';

-- 2. Parâmetros publicados (régua única conferida pelo gate) ---------------
CREATE OR REPLACE FUNCTION public.episode_reconciliation_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'abandonedOpenDays', 30,
    'maxReconcilePerRun', 500
  )
$function$;

-- 3. O guarda passa a conhecer a procedência -------------------------------
CREATE OR REPLACE FUNCTION public.block_alarm_recurrence_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Única exceção: a rotina de retenção, que se identifica nominalmente.
    -- Qualquer outro caminho continua recusado, inclusive service_role.
    IF current_setting('app.retention_purge', true) IS DISTINCT FROM 'alarm_recurrence_episodes' THEN
      RAISE EXCEPTION 'alarm_recurrence_episodes é imutável (append-only)';
    END IF;
    IF OLD.closed_at IS NULL THEN
      RAISE EXCEPTION 'episódio aberto nunca é expurgado' USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.closed_at IS NOT NULL THEN
    RAISE EXCEPTION 'episódio já encerrado não pode ser alterado';
  END IF;
  IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.series_key IS DISTINCT FROM OLD.series_key
     OR NEW.opened_at IS DISTINCT FROM OLD.opened_at
     OR NEW.severity IS DISTINCT FROM OLD.severity THEN
    RAISE EXCEPTION 'somente o encerramento do episódio pode ser gravado';
  END IF;
  IF NEW.closed_at IS NULL THEN
    RAISE EXCEPTION 'atualização precisa encerrar o episódio';
  END IF;
  IF NEW.closed_at < OLD.opened_at THEN
    RAISE EXCEPTION 'encerramento antes da abertura' USING ERRCODE = 'check_violation';
  END IF;
  -- A procedência só pode ser declarada no ato do fechamento, e apenas para os
  -- dois valores conhecidos. Sem isto, qualquer caminho poderia rebaixar um
  -- fechamento reconciliado a "observado" e apagar o aviso de que a duração é
  -- convenção.
  IF NEW.close_source NOT IN ('observed', 'reconciled') THEN
    RAISE EXCEPTION 'procedência de encerramento desconhecida' USING ERRCODE = 'check_violation';
  END IF;
  NEW.duration_ms := (EXTRACT(EPOCH FROM (NEW.closed_at - OLD.opened_at)) * 1000)::bigint;
  RETURN NEW;
END;
$function$;

-- 4. Reconciliação ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reconcile_abandoned_episodes(
  p_organization_id uuid,
  p_now timestamptz DEFAULT now(),
  p_limit integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid := auth.uid();
  v_now timestamptz := coalesce(p_now, now());
  v_days int := (public.episode_reconciliation_policy() ->> 'abandonedOpenDays')::int;
  v_max int := (public.episode_reconciliation_policy() ->> 'maxReconcilePerRun')::int;
  v_limit int := LEAST(GREATEST(coalesce(p_limit, v_max), 1), v_max);
  v_cutoff timestamptz;
  v_closed int := 0;
  v_deferred int := 0;
  v_unreadable int := 0;
  v_eligible int := 0;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'autenticação obrigatória' USING ERRCODE = 'insufficient_privilege';
  END IF;
  -- Reconciliar reescreve o denominador de indicadores. É ato de manutenção,
  -- não de operação: exige o papel, além do vínculo com a organização.
  IF NOT public.is_org_member(p_organization_id, v_actor)
     OR NOT public.has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'sem permissão para reconciliar episódios' USING ERRCODE = 'insufficient_privilege';
  END IF;

  v_cutoff := v_now - make_interval(days => v_days);

  SELECT count(*) INTO v_unreadable
    FROM public.alarm_recurrence_episodes e
   WHERE e.organization_id = p_organization_id
     AND e.closed_at IS NULL
     AND e.opened_at > v_now;

  SELECT count(*) INTO v_eligible
    FROM public.alarm_recurrence_episodes e
   WHERE e.organization_id = p_organization_id
     AND e.closed_at IS NULL
     AND e.opened_at <= v_cutoff;

  WITH batch AS (
    SELECT e.id
      FROM public.alarm_recurrence_episodes e
     WHERE e.organization_id = p_organization_id
       AND e.closed_at IS NULL
       AND e.opened_at <= v_cutoff
     ORDER BY e.opened_at ASC
     LIMIT v_limit
     FOR UPDATE
  ), done AS (
    UPDATE public.alarm_recurrence_episodes e
       -- Corte declarado: nunca `v_now`. Fechar em "agora" fabricaria uma
       -- duração de meses para um alarme que acabou no primeiro dia.
       SET closed_at = e.opened_at + make_interval(days => v_days),
           close_source = 'reconciled'
      FROM batch b
     WHERE e.id = b.id
     RETURNING e.id
  )
  SELECT count(*) INTO v_closed FROM done;

  v_deferred := GREATEST(v_eligible - v_closed, 0);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, severity, details)
  VALUES (
    v_actor,
    'reconcile_abandoned_episodes',
    'alarm_recurrence_episodes',
    p_organization_id,
    CASE WHEN v_closed > 0 THEN 'warning' ELSE 'info' END,
    jsonb_build_object(
      'organizationId', p_organization_id,
      'evaluatedAt', v_now,
      'cutoff', v_cutoff,
      'abandonedOpenDays', v_days,
      'closed', v_closed,
      'deferred', v_deferred,
      'unreadableClock', v_unreadable
    )
  );

  RETURN jsonb_build_object(
    'closed', v_closed,
    'deferred', v_deferred,
    'unreadableClock', v_unreadable,
    'cutoff', v_cutoff,
    'abandonedOpenDays', v_days
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.reconcile_abandoned_episodes(uuid, timestamptz, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reconcile_abandoned_episodes(uuid, timestamptz, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.episode_reconciliation_policy() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.episode_reconciliation_policy() TO authenticated;