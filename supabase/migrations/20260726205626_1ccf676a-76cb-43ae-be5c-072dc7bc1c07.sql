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
  -- Não gravamos 'expired' aqui: o RAISE aborta a transação e a gravação seria
  -- descartada de qualquer forma. Quem materializa é o cron ou o próximo convite.
  IF v_effective = 'expired' AND v_inv.status = 'pending' THEN
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

REVOKE ALL ON FUNCTION public.collab_respond_invite(uuid, boolean, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collab_respond_invite(uuid, boolean, timestamptz) TO authenticated, service_role;
