-- =============================================================
-- Onda 128 — Convites e governança da rede colaborativa
-- =============================================================

CREATE TABLE public.collab_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  invited_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_by uuid,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','revoked','expired')),
  ttl_days integer NOT NULL CHECK (ttl_days BETWEEN 1 AND 60),
  expires_at timestamptz NOT NULL,
  responded_at timestamptz,
  note text CHECK (note IS NULL OR length(note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Um único convite EM ABERTO por (rede, organização). Convites terminais
-- podem se acumular: são o histórico que alimenta o anti-assédio.
CREATE UNIQUE INDEX collab_invitations_one_pending
  ON public.collab_invitations (network_id, invited_org_id)
  WHERE status = 'pending';
CREATE INDEX collab_invitations_org_idx
  ON public.collab_invitations (invited_org_id, status, expires_at DESC);
CREATE INDEX collab_invitations_expiry_idx
  ON public.collab_invitations (expires_at) WHERE status = 'pending';

CREATE TABLE public.collab_governance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id uuid NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invitation_id uuid REFERENCES public.collab_invitations(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN (
    'invite_created','invite_accepted','invite_declined','invite_revoked',
    'invite_expired','membership_suspended','membership_reinstated','membership_removed')),
  actor_user_id uuid,
  actor_org_id uuid,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX collab_governance_audit_network_idx
  ON public.collab_governance_audit (network_id, created_at DESC);
CREATE INDEX collab_governance_audit_org_idx
  ON public.collab_governance_audit (organization_id, created_at DESC);

-- --- Privilégios: os default privileges do papel `postgres` reconcedem TUDO a
-- --- authenticated no CREATE TABLE. Revogar nominalmente e reconceder o mínimo.
REVOKE ALL ON public.collab_invitations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.collab_governance_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.collab_invitations TO authenticated;
GRANT SELECT ON public.collab_governance_audit TO authenticated;
GRANT ALL ON public.collab_invitations TO service_role;
GRANT ALL ON public.collab_governance_audit TO service_role;

ALTER TABLE public.collab_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_governance_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY collab_invitations_select_parties
  ON public.collab_invitations FOR SELECT TO authenticated
  USING (
    invited_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
    OR EXISTS (SELECT 1 FROM public.collab_networks n
                WHERE n.id = collab_invitations.network_id
                  AND n.owner_org_id IN (SELECT public.collab_user_orgs(auth.uid())))
  );

CREATE POLICY collab_governance_audit_select_parties
  ON public.collab_governance_audit FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.collab_user_orgs(auth.uid()))
    OR EXISTS (SELECT 1 FROM public.collab_networks n
                WHERE n.id = collab_governance_audit.network_id
                  AND n.owner_org_id IN (SELECT public.collab_user_orgs(auth.uid())))
  );

CREATE TRIGGER trg_collab_invitations_updated
  BEFORE UPDATE ON public.collab_invitations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trilha imutável: nem o dono da rede reescreve o passado.
CREATE OR REPLACE FUNCTION public.collab_governance_audit_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'collab_governance_audit is append-only (attempted %)', TG_OP;
END;
$$;
CREATE TRIGGER trg_collab_governance_audit_immutable
  BEFORE UPDATE OR DELETE ON public.collab_governance_audit
  FOR EACH ROW EXECUTE FUNCTION public.collab_governance_audit_immutable();

-- =============================================================
-- Política — espelho literal de COLLAB_GOVERNANCE_POLICY (TS)
-- =============================================================
CREATE OR REPLACE FUNCTION public.collab_governance_policy()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT jsonb_build_object(
    'defaultInviteTtlDays', 14,
    'maxInviteTtlDays', 60,
    'maxPendingInvitesPerNetwork', 200,
    'maxPendingInvitesPerOrg', 20,
    'reinviteAfterDeclineSeconds', 86400,
    'reinviteAfterRevokeSeconds', 3600,
    'suspensionIsReversible', true
  )
$$;

-- O relógio vence o registro: `pending` vencido já está expirado.
CREATE OR REPLACE FUNCTION public.collab_effective_invite_status(
  p_status text, p_expires_at timestamptz, p_now timestamptz DEFAULT now())
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN p_status <> 'pending' THEN p_status
    WHEN p_expires_at IS NULL OR p_now IS NULL THEN 'pending'
    WHEN p_now >= p_expires_at THEN 'expired'
    ELSE 'pending' END
$$;

-- =============================================================
-- Ações de governança
-- =============================================================
CREATE OR REPLACE FUNCTION public.collab_invite_org(
  p_network_id uuid, p_invited_org_id uuid,
  p_ttl_days integer DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_actor_org uuid;
  v_ttl integer := COALESCE(p_ttl_days, 14);
  v_membership text;
  v_pending_net integer;
  v_pending_org integer;
  v_last_decline timestamptz;
  v_last_revoke timestamptz;
  v_id uuid;
BEGIN
  SELECT owner_org_id INTO v_owner FROM collab_networks WHERE id = p_network_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'not_network_owner'; END IF;

  SELECT o INTO v_actor_org FROM unnest(ARRAY(SELECT collab_user_orgs(auth.uid()))) AS o
   WHERE o = v_owner;
  IF v_actor_org IS NULL THEN RAISE EXCEPTION 'not_network_owner'; END IF;
  IF p_invited_org_id = v_owner THEN RAISE EXCEPTION 'target_is_owner'; END IF;

  SELECT status INTO v_membership FROM collab_memberships
   WHERE network_id = p_network_id AND organization_id = p_invited_org_id;
  IF v_membership IN ('active','suspended') THEN RAISE EXCEPTION 'already_member'; END IF;

  IF EXISTS (SELECT 1 FROM collab_invitations
              WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id
                AND collab_effective_invite_status(status, expires_at) = 'pending')
  THEN RAISE EXCEPTION 'invite_already_pending'; END IF;

  IF v_ttl IS NULL OR v_ttl < 1 OR v_ttl > 60 THEN RAISE EXCEPTION 'ttl_out_of_range'; END IF;

  SELECT count(*) INTO v_pending_net FROM collab_invitations
   WHERE network_id = p_network_id
     AND collab_effective_invite_status(status, expires_at) = 'pending';
  IF v_pending_net >= 200 THEN RAISE EXCEPTION 'network_invite_quota'; END IF;

  SELECT count(*) INTO v_pending_org FROM collab_invitations
   WHERE invited_org_id = p_invited_org_id
     AND collab_effective_invite_status(status, expires_at) = 'pending';
  IF v_pending_org >= 20 THEN RAISE EXCEPTION 'org_invite_quota'; END IF;

  SELECT max(responded_at) INTO v_last_decline FROM collab_invitations
   WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id AND status = 'declined';
  IF v_last_decline IS NOT NULL AND now() - v_last_decline < interval '86400 seconds'
  THEN RAISE EXCEPTION 'reinvite_cooldown'; END IF;

  SELECT max(responded_at) INTO v_last_revoke FROM collab_invitations
   WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id AND status = 'revoked';
  IF v_last_revoke IS NOT NULL AND now() - v_last_revoke < interval '3600 seconds'
  THEN RAISE EXCEPTION 'reinvite_cooldown'; END IF;

  INSERT INTO collab_invitations (network_id, invited_org_id, invited_by, ttl_days, expires_at, note)
  VALUES (p_network_id, p_invited_org_id, auth.uid(), v_ttl,
          now() + make_interval(days => v_ttl), nullif(btrim(p_note), ''))
  RETURNING id INTO v_id;

  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id, detail)
  VALUES (p_network_id, p_invited_org_id, v_id, 'invite_created', auth.uid(), v_owner,
          jsonb_build_object('ttlDays', v_ttl));
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_respond_invite(p_invitation_id uuid, p_accept boolean)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv collab_invitations%ROWTYPE;
  v_effective text;
  v_new text;
BEGIN
  SELECT * INTO v_inv FROM collab_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_invited_org'; END IF;
  IF NOT (v_inv.invited_org_id IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_invited_org'; END IF;

  v_effective := collab_effective_invite_status(v_inv.status, v_inv.expires_at);
  IF v_effective = 'expired' AND v_inv.status = 'pending' THEN
    UPDATE collab_invitations SET status = 'expired', responded_at = now() WHERE id = v_inv.id;
    INSERT INTO collab_governance_audit
      (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id)
    VALUES (v_inv.network_id, v_inv.invited_org_id, v_inv.id, 'invite_expired', auth.uid(), v_inv.invited_org_id);
    RAISE EXCEPTION 'invite_expired';
  END IF;
  IF v_effective <> 'pending' THEN RAISE EXCEPTION 'invite_not_pending'; END IF;

  v_new := CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END;
  UPDATE collab_invitations SET status = v_new, responded_at = now() WHERE id = v_inv.id;

  IF p_accept THEN
    INSERT INTO collab_memberships (network_id, organization_id, status)
    VALUES (v_inv.network_id, v_inv.invited_org_id, 'active')
    ON CONFLICT (network_id, organization_id)
      DO UPDATE SET status = 'active', updated_at = now();
  END IF;

  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id)
  VALUES (v_inv.network_id, v_inv.invited_org_id, v_inv.id,
          CASE WHEN p_accept THEN 'invite_accepted' ELSE 'invite_declined' END,
          auth.uid(), v_inv.invited_org_id);
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_revoke_invite(p_invitation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv collab_invitations%ROWTYPE;
  v_owner uuid;
BEGIN
  SELECT * INTO v_inv FROM collab_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_network_owner'; END IF;
  SELECT owner_org_id INTO v_owner FROM collab_networks WHERE id = v_inv.network_id;
  IF NOT (v_owner IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_network_owner'; END IF;
  IF collab_effective_invite_status(v_inv.status, v_inv.expires_at) <> 'pending'
  THEN RAISE EXCEPTION 'invite_not_pending'; END IF;

  UPDATE collab_invitations SET status = 'revoked', responded_at = now() WHERE id = v_inv.id;
  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id)
  VALUES (v_inv.network_id, v_inv.invited_org_id, v_inv.id, 'invite_revoked', auth.uid(), v_owner);
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_set_membership_status(
  p_network_id uuid, p_organization_id uuid, p_status text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_current text;
  v_legal boolean;
BEGIN
  SELECT owner_org_id INTO v_owner FROM collab_networks WHERE id = p_network_id;
  IF v_owner IS NULL OR NOT (v_owner IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_network_owner'; END IF;

  SELECT status INTO v_current FROM collab_memberships
   WHERE network_id = p_network_id AND organization_id = p_organization_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'membership_not_found'; END IF;
  IF p_organization_id = v_owner THEN RAISE EXCEPTION 'owner_membership_immutable'; END IF;

  v_legal := CASE
    WHEN v_current = 'pending'   AND p_status IN ('active','suspended') THEN true
    WHEN v_current = 'active'    AND p_status = 'suspended' THEN true
    WHEN v_current = 'suspended' AND p_status = 'active' THEN true
    ELSE false END;
  IF NOT v_legal THEN RAISE EXCEPTION 'illegal_transition'; END IF;

  UPDATE collab_memberships SET status = p_status, updated_at = now()
   WHERE network_id = p_network_id AND organization_id = p_organization_id;

  INSERT INTO collab_governance_audit
    (network_id, organization_id, action, actor_user_id, actor_org_id, detail)
  VALUES (p_network_id, p_organization_id,
          CASE WHEN p_status = 'suspended' THEN 'membership_suspended' ELSE 'membership_reinstated' END,
          auth.uid(), v_owner, jsonb_build_object('from', v_current, 'to', p_status));
  RETURN p_status;
END;
$$;

-- Remoção é definitiva: quem saiu não continua alertando a rede que abandonou.
CREATE OR REPLACE FUNCTION public.collab_remove_membership(
  p_network_id uuid, p_organization_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_current text;
  v_revoked integer := 0;
BEGIN
  SELECT owner_org_id INTO v_owner FROM collab_networks WHERE id = p_network_id;
  IF v_owner IS NULL OR NOT (v_owner IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_network_owner'; END IF;

  SELECT status INTO v_current FROM collab_memberships
   WHERE network_id = p_network_id AND organization_id = p_organization_id FOR UPDATE;
  IF v_current IS NULL THEN RAISE EXCEPTION 'membership_not_found'; END IF;
  IF p_organization_id = v_owner THEN RAISE EXCEPTION 'owner_membership_immutable'; END IF;

  UPDATE collab_entries SET revoked_at = now()
   WHERE network_id = p_network_id AND organization_id = p_organization_id AND revoked_at IS NULL;
  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  DELETE FROM collab_memberships
   WHERE network_id = p_network_id AND organization_id = p_organization_id;

  INSERT INTO collab_governance_audit
    (network_id, organization_id, action, actor_user_id, actor_org_id, detail)
  VALUES (p_network_id, p_organization_id, 'membership_removed', auth.uid(), v_owner,
          jsonb_build_object('from', v_current, 'revokedEntries', v_revoked));
  RETURN v_revoked;
END;
$$;

-- Limpeza: materializa o que o relógio já decidiu.
CREATE OR REPLACE FUNCTION public.collab_expire_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE collab_invitations SET status = 'expired', responded_at = now()
     WHERE status = 'pending' AND expires_at <= now()
    RETURNING id, network_id, invited_org_id)
  INSERT INTO collab_governance_audit (network_id, organization_id, invitation_id, action)
  SELECT network_id, invited_org_id, id, 'invite_expired' FROM expired;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- --- Privilégios de execução: nada para anon/PUBLIC; cron só no service_role.
REVOKE ALL ON FUNCTION public.collab_governance_policy() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_effective_invite_status(text, timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_invite_org(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_respond_invite(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_revoke_invite(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_set_membership_status(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_remove_membership(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_expire_invitations() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.collab_governance_policy() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_effective_invite_status(text, timestamptz, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_invite_org(uuid, uuid, integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_respond_invite(uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_revoke_invite(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_set_membership_status(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_remove_membership(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_expire_invitations() TO service_role;

SELECT cron.schedule('collab-expire-invitations', '11 * * * *',
                     $$SELECT public.collab_expire_invitations()$$);
