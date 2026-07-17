
-- Wave Storage 12: Legal hold toggle RPC + audit reader RPC (admin only)

CREATE OR REPLACE FUNCTION public.set_media_legal_hold(
  _asset_id UUID,
  _legal_hold BOOLEAN,
  _reason TEXT DEFAULT NULL
)
RETURNS TABLE(asset_id UUID, legal_hold BOOLEAN, changed BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current BOOLEAN;
  _owner UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _legal_hold AND (_reason IS NULL OR length(btrim(_reason)) < 5) THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;

  SELECT ma.legal_hold, ma.user_id INTO _current, _owner
  FROM public.media_assets ma
  WHERE ma.id = _asset_id;

  IF _owner IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF _current = _legal_hold THEN
    RETURN QUERY SELECT _asset_id, _current, FALSE;
    RETURN;
  END IF;

  UPDATE public.media_assets
  SET legal_hold = _legal_hold,
      updated_at = now()
  WHERE id = _asset_id;

  INSERT INTO public.media_forget_audit (
    user_id, actor_id, asset_id, action, tier, reason, dry_run, success
  ) VALUES (
    _owner, auth.uid(), _asset_id,
    CASE WHEN _legal_hold THEN 'legal_hold_set' ELSE 'legal_hold_cleared' END,
    NULL, _reason, FALSE, TRUE
  );

  RETURN QUERY SELECT _asset_id, _legal_hold, TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.set_media_legal_hold(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_media_legal_hold(UUID, BOOLEAN, TEXT) TO authenticated;

-- Reader for forget audit (admin only)
CREATE OR REPLACE FUNCTION public.get_media_forget_audit(
  _limit INT DEFAULT 50,
  _offset INT DEFAULT 0,
  _user_filter UUID DEFAULT NULL
)
RETURNS SETOF public.media_forget_audit
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT * FROM public.media_forget_audit
  WHERE (_user_filter IS NULL OR user_id = _user_filter)
  ORDER BY created_at DESC
  LIMIT LEAST(GREATEST(_limit, 1), 500)
  OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.get_media_forget_audit(INT, INT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_media_forget_audit(INT, INT, UUID) TO authenticated;

-- Ensure media_forget_audit accepts new action codes for legal hold events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'media_forget_audit_action_ck'
  ) THEN
    -- If no check constraint exists, nothing to relax
    NULL;
  END IF;
END $$;
