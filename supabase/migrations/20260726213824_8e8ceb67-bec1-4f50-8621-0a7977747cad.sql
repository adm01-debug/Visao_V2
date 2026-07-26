-- Onda 133 — Ciclo de vida das entradas compartilhadas e preservação da prova.
-- Espelho SQL de src/lib/collab/collabEntryLifecycle.ts
-- (gate: scripts/check-collab-entry-lifecycle.mjs)

-- 1) Avistamento passa a sobreviver à morte da entrada -------------------------
ALTER TABLE public.collab_matches
  ADD COLUMN IF NOT EXISTS owner_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plate_hash   bytea,
  ADD COLUMN IF NOT EXISTS entry_reason text;

UPDATE public.collab_matches m
   SET owner_org_id = e.owner_org_id,
       plate_hash   = e.plate_hash,
       entry_reason = e.reason
  FROM public.collab_entries e
 WHERE e.id = m.entry_id
   AND (m.owner_org_id IS NULL OR m.plate_hash IS NULL);

ALTER TABLE public.collab_matches ALTER COLUMN entry_id DROP NOT NULL;
ALTER TABLE public.collab_matches DROP CONSTRAINT IF EXISTS collab_matches_entry_id_fkey;
ALTER TABLE public.collab_matches
  ADD CONSTRAINT collab_matches_entry_id_fkey
  FOREIGN KEY (entry_id) REFERENCES public.collab_entries(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS collab_matches_owner ON public.collab_matches (owner_org_id, matched_at DESC);
CREATE INDEX IF NOT EXISTS collab_matches_age   ON public.collab_matches (matched_at);

-- Trigger: congela a cópia mínima no instante do avistamento.
CREATE OR REPLACE FUNCTION public.collab_matches_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT e.owner_org_id, e.plate_hash, e.reason
      INTO NEW.owner_org_id, NEW.plate_hash, NEW.entry_reason
      FROM public.collab_entries e
     WHERE e.id = NEW.entry_id;
    RETURN NEW;
  END IF;

  -- A prova é imutável: nenhuma atualização pode reescrever a cópia.
  NEW.owner_org_id := OLD.owner_org_id;
  NEW.plate_hash   := OLD.plate_hash;
  NEW.entry_reason := OLD.entry_reason;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_collab_matches_snapshot ON public.collab_matches;
CREATE TRIGGER trg_collab_matches_snapshot
  BEFORE INSERT OR UPDATE ON public.collab_matches
  FOR EACH ROW EXECUTE FUNCTION public.collab_matches_snapshot();

-- RLS: leitura pelo dono usa a cópia congelada, não mais o join com a entrada
-- (que deixa de existir depois do expurgo).
DROP POLICY IF EXISTS collab_matches_select_parties ON public.collab_matches;
CREATE POLICY collab_matches_select_parties ON public.collab_matches
  FOR SELECT TO authenticated
  USING (
    reader_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
    OR owner_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
  );

-- 2) Política de ciclo de vida -------------------------------------------------
CREATE OR REPLACE FUNCTION public.collab_entry_lifecycle_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'revokedGraceDays', 30,
    'expiredGraceDays', 30,
    'matchRetentionDays', 180,
    'maxDeletePerRun', 5000
  )
$$;

-- 3) Auditoria das execuções ---------------------------------------------------
CREATE TABLE IF NOT EXISTS public.collab_entry_purge_runs (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at      timestamptz NOT NULL DEFAULT now(),
  deleted_matches  integer NOT NULL DEFAULT 0,
  deleted_entries  integer NOT NULL DEFAULT 0,
  truncated        boolean NOT NULL DEFAULT false,
  policy           jsonb   NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.collab_entry_purge_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.collab_entry_purge_runs TO authenticated;
GRANT ALL ON public.collab_entry_purge_runs TO service_role;
ALTER TABLE public.collab_entry_purge_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS collab_entry_purge_runs_admin_read ON public.collab_entry_purge_runs;
CREATE POLICY collab_entry_purge_runs_admin_read ON public.collab_entry_purge_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4) Rotina de expurgo ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.collab_purge_entries(p_now timestamptz DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy jsonb := public.collab_entry_lifecycle_policy();
  v_limit  int   := (v_policy ->> 'maxDeletePerRun')::int;
  v_revoked interval := ((v_policy ->> 'revokedGraceDays')::int || ' days')::interval;
  v_expired interval := ((v_policy ->> 'expiredGraceDays')::int || ' days')::interval;
  v_match   interval := ((v_policy ->> 'matchRetentionDays')::int || ' days')::interval;
  v_deleted_matches int := 0;
  v_deleted_entries int := 0;
  v_pending_matches int := 0;
  v_pending_entries int := 0;
  v_truncated boolean;
BEGIN
  WITH victims AS (
    SELECT id FROM public.collab_matches
     WHERE matched_at < p_now - v_match
     ORDER BY matched_at
     LIMIT v_limit
  ), gone AS (
    DELETE FROM public.collab_matches m USING victims v WHERE m.id = v.id RETURNING 1
  )
  SELECT count(*) INTO v_deleted_matches FROM gone;

  SELECT count(*) INTO v_pending_matches
    FROM public.collab_matches WHERE matched_at < p_now - v_match;

  WITH victims AS (
    SELECT id FROM public.collab_entries
     WHERE (revoked_at IS NOT NULL AND revoked_at < p_now - v_revoked)
        OR expires_at < p_now - v_expired
     ORDER BY COALESCE(revoked_at, expires_at)
     LIMIT v_limit
  ), gone AS (
    DELETE FROM public.collab_entries e USING victims v WHERE e.id = v.id RETURNING 1
  )
  SELECT count(*) INTO v_deleted_entries FROM gone;

  SELECT count(*) INTO v_pending_entries
    FROM public.collab_entries
   WHERE (revoked_at IS NOT NULL AND revoked_at < p_now - v_revoked)
      OR expires_at < p_now - v_expired;

  v_truncated := v_pending_matches > 0 OR v_pending_entries > 0;

  INSERT INTO public.collab_entry_purge_runs
    (executed_at, deleted_matches, deleted_entries, truncated, policy)
  VALUES (p_now, v_deleted_matches, v_deleted_entries, v_truncated, v_policy);

  RETURN jsonb_build_object(
    'deletedMatches', v_deleted_matches,
    'deletedEntries', v_deleted_entries,
    'truncated', v_truncated
  );
END;
$$;

REVOKE ALL ON FUNCTION public.collab_purge_entries(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_entry_lifecycle_policy() FROM PUBLIC, anon;

-- 5) Agendamento diário --------------------------------------------------------
SELECT cron.unschedule('collab-purge-entries')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'collab-purge-entries');

SELECT cron.schedule(
  'collab-purge-entries',
  '29 3 * * *',
  $cron$ SELECT public.collab_purge_entries(now()); $cron$
);