DROP FUNCTION IF EXISTS public.collab_invite_org(uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.collab_respond_invite(uuid, boolean);
DROP FUNCTION IF EXISTS public.collab_revoke_invite(uuid);
DROP FUNCTION IF EXISTS public.collab_expire_invitations();

CREATE OR REPLACE FUNCTION public.collab_invite_org(
  p_network_id uuid, p_invited_org_id uuid,
  p_ttl_days integer DEFAULT NULL, p_note text DEFAULT NULL,
  p_now timestamptz DEFAULT now())
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_ttl integer := COALESCE(p_ttl_days, 14);
  v_now timestamptz := COALESCE(p_now, now());
  v_membership text;
  v_pending_net integer;
  v_pending_org integer;
  v_last_decline timestamptz;
  v_last_revoke timestamptz;
  v_id uuid;
BEGIN
  SELECT owner_org_id INTO v_owner FROM collab_networks WHERE id = p_network_id;
  IF v_owner IS NULL OR NOT (v_owner IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_network_owner'; END IF;
  IF p_invited_org_id = v_owner THEN RAISE EXCEPTION 'target_is_owner'; END IF;

  SELECT status INTO v_membership FROM collab_memberships
   WHERE network_id = p_network_id AND organization_id = p_invited_org_id;
  IF v_membership IN ('active','suspended') THEN RAISE EXCEPTION 'already_member'; END IF;

  IF EXISTS (SELECT 1 FROM collab_invitations
              WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id
                AND collab_effective_invite_status(status, expires_at, v_now) = 'pending')
  THEN RAISE EXCEPTION 'invite_already_pending'; END IF;

  IF v_ttl IS NULL OR v_ttl < 1 OR v_ttl > 60 THEN RAISE EXCEPTION 'ttl_out_of_range'; END IF;

  SELECT count(*) INTO v_pending_net FROM collab_invitations
   WHERE network_id = p_network_id
     AND collab_effective_invite_status(status, expires_at, v_now) = 'pending';
  IF v_pending_net >= 200 THEN RAISE EXCEPTION 'network_invite_quota'; END IF;

  SELECT count(*) INTO v_pending_org FROM collab_invitations
   WHERE invited_org_id = p_invited_org_id
     AND collab_effective_invite_status(status, expires_at, v_now) = 'pending';
  IF v_pending_org >= 20 THEN RAISE EXCEPTION 'org_invite_quota'; END IF;

  SELECT max(responded_at) INTO v_last_decline FROM collab_invitations
   WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id AND status = 'declined';
  IF v_last_decline IS NOT NULL AND v_now - v_last_decline < interval '86400 seconds'
  THEN RAISE EXCEPTION 'reinvite_cooldown'; END IF;

  SELECT max(responded_at) INTO v_last_revoke FROM collab_invitations
   WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id AND status = 'revoked';
  IF v_last_revoke IS NOT NULL AND v_now - v_last_revoke < interval '3600 seconds'
  THEN RAISE EXCEPTION 'reinvite_cooldown'; END IF;

  INSERT INTO collab_invitations
    (network_id, invited_org_id, invited_by, ttl_days, expires_at, note, created_at)
  VALUES (p_network_id, p_invited_org_id, auth.uid(), v_ttl,
          v_now + make_interval(days => v_ttl), nullif(btrim(p_note), ''), v_now)
  RETURNING id INTO v_id;

  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id, detail, created_at)
  VALUES (p_network_id, p_invited_org_id, v_id, 'invite_created', auth.uid(), v_owner,
          jsonb_build_object('ttlDays', v_ttl), v_now);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_respond_invite(
  p_invitation_id uuid, p_accept boolean, p_now timestamptz DEFAULT now())
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv collab_invitations%ROWTYPE;
  v_now timestamptz := COALESCE(p_now, now());
  v_effective text;
  v_new text;
BEGIN
  SELECT * INTO v_inv FROM collab_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND OR NOT (v_inv.invited_org_id IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_invited_org'; END IF;

  v_effective := collab_effective_invite_status(v_inv.status, v_inv.expires_at, v_now);
  IF v_effective = 'expired' AND v_inv.status = 'pending' THEN
    UPDATE collab_invitations SET status = 'expired', responded_at = v_now WHERE id = v_inv.id;
    INSERT INTO collab_governance_audit
      (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id, created_at)
    VALUES (v_inv.network_id, v_inv.invited_org_id, v_inv.id, 'invite_expired',
            auth.uid(), v_inv.invited_org_id, v_now);
    RAISE EXCEPTION 'invite_expired';
  END IF;
  IF v_effective <> 'pending' THEN RAISE EXCEPTION 'invite_not_pending'; END IF;

  v_new := CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END;
  UPDATE collab_invitations SET status = v_new, responded_at = v_now WHERE id = v_inv.id;

  IF p_accept THEN
    INSERT INTO collab_memberships (network_id, organization_id, status)
    VALUES (v_inv.network_id, v_inv.invited_org_id, 'active')
    ON CONFLICT (network_id, organization_id)
      DO UPDATE SET status = 'active', updated_at = now();
  END IF;

  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id, created_at)
  VALUES (v_inv.network_id, v_inv.invited_org_id, v_inv.id,
          CASE WHEN p_accept THEN 'invite_accepted' ELSE 'invite_declined' END,
          auth.uid(), v_inv.invited_org_id, v_now);
  RETURN v_new;
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_revoke_invite(
  p_invitation_id uuid, p_now timestamptz DEFAULT now())
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_inv collab_invitations%ROWTYPE;
  v_now timestamptz := COALESCE(p_now, now());
  v_owner uuid;
BEGIN
  SELECT * INTO v_inv FROM collab_invitations WHERE id = p_invitation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_network_owner'; END IF;
  SELECT owner_org_id INTO v_owner FROM collab_networks WHERE id = v_inv.network_id;
  IF NOT (v_owner IN (SELECT collab_user_orgs(auth.uid())))
  THEN RAISE EXCEPTION 'not_network_owner'; END IF;
  IF collab_effective_invite_status(v_inv.status, v_inv.expires_at, v_now) <> 'pending'
  THEN RAISE EXCEPTION 'invite_not_pending'; END IF;

  UPDATE collab_invitations SET status = 'revoked', responded_at = v_now WHERE id = v_inv.id;
  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, actor_user_id, actor_org_id, created_at)
  VALUES (v_inv.network_id, v_inv.invited_org_id, v_inv.id, 'invite_revoked',
          auth.uid(), v_owner, v_now);
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_expire_invitations(p_now timestamptz DEFAULT now())
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now timestamptz := COALESCE(p_now, now());
  v_count integer := 0;
BEGIN
  WITH expired AS (
    UPDATE collab_invitations SET status = 'expired', responded_at = v_now
     WHERE status = 'pending' AND expires_at <= v_now
    RETURNING id, network_id, invited_org_id)
  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, created_at)
  SELECT network_id, invited_org_id, id, 'invite_expired', v_now FROM expired;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.collab_invite_org(uuid, uuid, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_respond_invite(uuid, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_revoke_invite(uuid, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_expire_invitations(timestamptz) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.collab_invite_org(uuid, uuid, integer, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_respond_invite(uuid, boolean, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_revoke_invite(uuid, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_expire_invitations(timestamptz) TO service_role;

SELECT cron.unschedule('collab-expire-invitations');
SELECT cron.schedule('collab-expire-invitations', '11 * * * *',
                     $$SELECT public.collab_expire_invitations()$$);
