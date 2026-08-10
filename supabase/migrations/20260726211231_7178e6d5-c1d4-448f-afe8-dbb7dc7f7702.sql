-- ============================================================================
-- Onda 130 — Notificações da rede colaborativa (caixa de entrada por organização)
--
-- Princípios:
--  * O evento é emitido no ÚNICO choke point que já existe e é imutável:
--    a trilha `collab_governance_audit`. Se um fato foi auditado, ele notifica;
--    se não foi auditado, ele não aconteceu. Não há segundo caminho.
--  * Roteamento de mínimo privilégio: só as partes do fato recebem.
--  * Deduplicação por índice único (chave determinística), não por SELECT —
--    sob concorrência, checar-antes-de-inserir é uma corrida perdida.
--  * Escrita apenas por rotinas SECURITY DEFINER; a API só lê.
-- ============================================================================

-- ---------------------------------------------------------------- política ---
CREATE OR REPLACE FUNCTION public.collab_notification_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'retentionDays', 90,
    'unreadBadgeCap', 99,
    'maxSummaryChars', 280
  )
$$;

-- Ação de governança -> tipo de notificação (espelho de notificationKindForAction).
CREATE OR REPLACE FUNCTION public.collab_notification_kind(p_action text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_action
    WHEN 'invite_created'        THEN 'invite_received'
    WHEN 'invite_accepted'       THEN 'invite_accepted'
    WHEN 'invite_declined'       THEN 'invite_declined'
    WHEN 'invite_revoked'        THEN 'invite_revoked'
    WHEN 'invite_expired'        THEN 'invite_expired'
    WHEN 'membership_suspended'  THEN 'membership_suspended'
    WHEN 'membership_reinstated' THEN 'membership_reinstated'
    WHEN 'membership_removed'    THEN 'membership_removed'
  END
$$;

-- Audiências, na MESMA ordem estável do TypeScript (owner_org antes de counterpart_org).
CREATE OR REPLACE FUNCTION public.collab_notification_audiences(p_action text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_action
    WHEN 'invite_created'        THEN ARRAY['counterpart_org']
    WHEN 'invite_accepted'       THEN ARRAY['owner_org']
    WHEN 'invite_declined'       THEN ARRAY['owner_org']
    WHEN 'invite_revoked'        THEN ARRAY['counterpart_org']
    WHEN 'invite_expired'        THEN ARRAY['owner_org','counterpart_org']
    WHEN 'membership_suspended'  THEN ARRAY['counterpart_org']
    WHEN 'membership_reinstated' THEN ARRAY['counterpart_org']
    WHEN 'membership_removed'    THEN ARRAY['counterpart_org']
  END
$$;

CREATE OR REPLACE FUNCTION public.collab_notification_severity(p_kind text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_kind
    WHEN 'invite_received'       THEN 'attention'
    WHEN 'membership_suspended'  THEN 'attention'
    WHEN 'membership_removed'    THEN 'critical'
    ELSE 'info'
  END
$$;

-- Chave determinística: SEM relógio (reprocessar é o mesmo fato) e COM a
-- organização destinatária (no vencimento, as duas partes recebem linhas legítimas).
CREATE OR REPLACE FUNCTION public.collab_notification_dedup_key(
  p_kind text,
  p_organization_id uuid,
  p_network_id uuid,
  p_invitation_id uuid,
  p_counterpart_org_id uuid
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT p_kind || ':'
      || COALESCE(p_invitation_id::text, p_network_id::text || ':' || p_counterpart_org_id::text)
      || ':' || p_organization_id::text
$$;

-- ---------------------------------------------------------------- tabelas ---
CREATE TABLE public.collab_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_org_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  invitation_id uuid REFERENCES public.collab_invitations(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN (
    'invite_received','invite_accepted','invite_declined','invite_revoked',
    'invite_expired','membership_suspended','membership_reinstated','membership_removed')),
  severity text NOT NULL CHECK (severity IN ('info','attention','critical')),
  dedup_key text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- Ninguém é notificado da própria ação: invariante do dado, não da aplicação.
  CONSTRAINT collab_notifications_no_self CHECK (actor_org_id IS NULL OR actor_org_id <> organization_id)
);

-- O índice único É a deduplicação.
CREATE UNIQUE INDEX collab_notifications_dedup_uidx
  ON public.collab_notifications (dedup_key);
CREATE INDEX collab_notifications_org_idx
  ON public.collab_notifications (organization_id, created_at DESC);
CREATE INDEX collab_notifications_retention_idx
  ON public.collab_notifications (created_at);

GRANT SELECT ON public.collab_notifications TO authenticated;
GRANT ALL ON public.collab_notifications TO service_role;
REVOKE ALL ON public.collab_notifications FROM anon;

ALTER TABLE public.collab_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collab_notifications_select_org" ON public.collab_notifications
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT public.collab_user_orgs(auth.uid())));

CREATE TABLE public.collab_notification_reads (
  notification_id uuid NOT NULL REFERENCES public.collab_notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (notification_id, user_id)
);

CREATE INDEX collab_notification_reads_user_idx
  ON public.collab_notification_reads (user_id, read_at DESC);

GRANT SELECT ON public.collab_notification_reads TO authenticated;
GRANT ALL ON public.collab_notification_reads TO service_role;
REVOKE ALL ON public.collab_notification_reads FROM anon;

ALTER TABLE public.collab_notification_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collab_notification_reads_select_own" ON public.collab_notification_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_collab_notifications_updated
  BEFORE UPDATE ON public.collab_notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------- emissão ---
CREATE OR REPLACE FUNCTION public.collab_emit_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_org uuid;
  v_counterpart uuid := NEW.organization_id;
  v_kind text := public.collab_notification_kind(NEW.action);
  v_audience text;
  v_target uuid;
  v_actor uuid;
BEGIN
  IF v_kind IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT n.owner_org_id INTO v_owner_org
    FROM public.collab_networks n WHERE n.id = NEW.network_id;

  -- Dona == contraparte é dado inconsistente: melhor não notificar do que
  -- avisar alguém da própria ação.
  IF v_owner_org IS NULL OR v_owner_org = v_counterpart THEN
    RETURN NEW;
  END IF;

  FOREACH v_audience IN ARRAY public.collab_notification_audiences(NEW.action) LOOP
    IF v_audience = 'owner_org' THEN
      v_target := v_owner_org;
      v_actor  := v_counterpart;
    ELSE
      v_target := v_counterpart;
      v_actor  := v_owner_org;
    END IF;

    INSERT INTO public.collab_notifications (
      network_id, organization_id, actor_org_id, invitation_id,
      kind, severity, dedup_key, detail
    ) VALUES (
      NEW.network_id, v_target, v_actor, NEW.invitation_id,
      v_kind, public.collab_notification_severity(v_kind),
      public.collab_notification_dedup_key(v_kind, v_target, NEW.network_id, NEW.invitation_id, v_counterpart),
      jsonb_build_object('action', NEW.action, 'audit_id', NEW.id)
    )
    ON CONFLICT (dedup_key) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_collab_governance_audit_notify
  AFTER INSERT ON public.collab_governance_audit
  FOR EACH ROW EXECUTE FUNCTION public.collab_emit_notifications();

-- ------------------------------------------------------------ leitura/RPC ---
-- Marcar como lido só vale para notificações que a pessoa poderia ver.
CREATE OR REPLACE FUNCTION public.collab_mark_notifications_read(
  p_ids uuid[],
  p_now timestamptz DEFAULT now()
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'collab_notifications:not_authenticated';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  WITH visible AS (
    SELECT n.id FROM public.collab_notifications n
     WHERE n.id = ANY(p_ids)
       AND n.organization_id IN (SELECT public.collab_user_orgs(v_user))
  ), ins AS (
    INSERT INTO public.collab_notification_reads (notification_id, user_id, read_at)
    SELECT v.id, v_user, p_now FROM visible v
    ON CONFLICT (notification_id, user_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*)::int INTO v_count FROM ins;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.collab_mark_notifications_read(uuid[], timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collab_mark_notifications_read(uuid[], timestamptz) TO authenticated;

-- Contagem de não lidas por organização (evita baixar a caixa inteira só pelo badge).
CREATE OR REPLACE FUNCTION public.collab_unread_counts()
RETURNS TABLE (organization_id uuid, unread integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.organization_id, count(*)::int
    FROM public.collab_notifications n
   WHERE auth.uid() IS NOT NULL
     AND n.organization_id IN (SELECT public.collab_user_orgs(auth.uid()))
     AND NOT EXISTS (
       SELECT 1 FROM public.collab_notification_reads r
        WHERE r.notification_id = n.id AND r.user_id = auth.uid())
   GROUP BY n.organization_id
$$;

REVOKE ALL ON FUNCTION public.collab_unread_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collab_unread_counts() TO authenticated;

-- ---------------------------------------------------------------- limpeza ---
CREATE OR REPLACE FUNCTION public.collab_purge_notifications(p_now timestamptz DEFAULT now())
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days integer := (public.collab_notification_policy() ->> 'retentionDays')::int;
  v_deleted integer;
BEGIN
  DELETE FROM public.collab_notifications
   WHERE created_at <= p_now - make_interval(days => v_days);
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.collab_purge_notifications(timestamptz) FROM PUBLIC, anon, authenticated;