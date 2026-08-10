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

  -- `collab_entries` identifica o autor por `owner_org_id`.
  UPDATE collab_entries SET revoked_at = now()
   WHERE network_id = p_network_id AND owner_org_id = p_organization_id AND revoked_at IS NULL;
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

REVOKE ALL ON FUNCTION public.collab_remove_membership(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.collab_remove_membership(uuid, uuid) TO authenticated, service_role;
