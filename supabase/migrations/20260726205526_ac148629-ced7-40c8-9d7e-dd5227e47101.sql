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

  -- O relógio já matou esses convites; o índice parcial de "um convite em aberto"
  -- ainda os enxerga como vivos. Materializar aqui evita que a dona da rede fique
  -- refém do cron horário para reconvidar alguém.
  WITH stale AS (
    UPDATE collab_invitations SET status = 'expired', responded_at = v_now
     WHERE network_id = p_network_id AND invited_org_id = p_invited_org_id
       AND status = 'pending' AND expires_at <= v_now
    RETURNING id, network_id, invited_org_id)
  INSERT INTO collab_governance_audit
    (network_id, organization_id, invitation_id, action, created_at)
  SELECT network_id, invited_org_id, id, 'invite_expired', v_now FROM stale;

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

REVOKE ALL ON FUNCTION public.collab_invite_org(uuid, uuid, integer, text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collab_invite_org(uuid, uuid, integer, text, timestamptz) TO authenticated, service_role;
