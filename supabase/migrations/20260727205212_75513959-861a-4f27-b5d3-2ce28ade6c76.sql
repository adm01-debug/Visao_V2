-- Onda 151 — console de concessões: trilha imutável + rotinas de admissão.

CREATE TABLE IF NOT EXISTS public.user_capability_grant_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grant_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('granted', 'revoked')),
  actor_id uuid,
  user_id uuid NOT NULL,
  capability text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('grant', 'deny')),
  reason text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.user_capability_grant_audit FROM anon;
GRANT SELECT ON public.user_capability_grant_audit TO authenticated;
GRANT ALL ON public.user_capability_grant_audit TO service_role;

ALTER TABLE public.user_capability_grant_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read capability grant audit" ON public.user_capability_grant_audit;
CREATE POLICY "admins read capability grant audit"
  ON public.user_capability_grant_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS user_capability_grant_audit_user_idx
  ON public.user_capability_grant_audit (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_capability_grant_audit_grant_idx
  ON public.user_capability_grant_audit (grant_id);

-- Imutabilidade: a trilha é prova, não estado.
CREATE OR REPLACE FUNCTION public.block_capability_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'user_capability_grant_audit é imutável (tentativa de %)', TG_OP
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS user_capability_grant_audit_immutable ON public.user_capability_grant_audit;
CREATE TRIGGER user_capability_grant_audit_immutable
  BEFORE UPDATE OR DELETE ON public.user_capability_grant_audit
  FOR EACH ROW EXECUTE FUNCTION public.block_capability_audit_mutation();

-- ------------------------------------------------------------------
-- Admissão de concessão. Espelha src/lib/permissions/grantConsole.ts.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.grant_capability(
  _user_id uuid,
  _capability text,
  _effect text,
  _reason text,
  _expires_at timestamptz
)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_now timestamptz := now();
  v_target_role app_role;
  v_actor_caps text[];
  v_target_caps text[];
  v_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  v_actor_caps := public.effective_capabilities(v_actor, v_now);
  IF NOT ('users.grant_capability' = ANY (v_actor_caps)) THEN
    RAISE EXCEPTION 'actor_missing_capability' USING ERRCODE = '42501';
  END IF;

  IF _user_id IS NULL OR _user_id = v_actor THEN
    RAISE EXCEPTION 'self_grant' USING ERRCODE = '22023';
  END IF;

  IF _effect IS NULL OR _effect NOT IN ('grant', 'deny') THEN
    RAISE EXCEPTION 'invalid_effect' USING ERRCODE = '22023';
  END IF;

  IF _capability IS NULL OR NOT (_capability = ANY (public.capability_catalog())) THEN
    RAISE EXCEPTION 'unknown_capability' USING ERRCODE = '22023';
  END IF;

  IF _reason IS NULL OR length(btrim(_reason)) < 8 THEN
    RAISE EXCEPTION 'reason_required' USING ERRCODE = '22023';
  END IF;

  IF _expires_at IS NULL THEN
    RAISE EXCEPTION 'expiry_required' USING ERRCODE = '22023';
  END IF;
  IF _expires_at <= v_now THEN
    RAISE EXCEPTION 'expiry_in_past' USING ERRCODE = '22023';
  END IF;
  IF _expires_at - v_now > interval '90 days' THEN
    RAISE EXCEPTION 'expiry_too_far' USING ERRCODE = '22023';
  END IF;

  v_target_role := public.effective_app_role(_user_id);
  v_target_caps := public.effective_capabilities(_user_id, v_now);

  IF _effect = 'grant' THEN
    IF NOT (_capability = ANY (v_actor_caps)) THEN
      RAISE EXCEPTION 'escalation' USING ERRCODE = '42501';
    END IF;
    IF _capability = ANY (v_target_caps) THEN
      RAISE EXCEPTION 'redundant_grant' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF v_target_role = 'admin' AND _capability = 'users.grant_capability' THEN
      RAISE EXCEPTION 'ineffective_deny' USING ERRCODE = '22023';
    END IF;
    IF NOT (_capability = ANY (v_target_caps)) THEN
      RAISE EXCEPTION 'ineffective_deny' USING ERRCODE = '22023';
    END IF;
  END IF;

  INSERT INTO public.user_capability_grants
    (user_id, capability, effect, reason, granted_by, expires_at)
  VALUES (_user_id, _capability, _effect, btrim(_reason), v_actor, _expires_at)
  RETURNING id INTO v_id;

  INSERT INTO public.user_capability_grant_audit
    (grant_id, action, actor_id, user_id, capability, effect, reason, expires_at)
  VALUES (v_id, 'granted', v_actor, _user_id, _capability, _effect, btrim(_reason), _expires_at);

  RETURN v_id;
END;
$$;

-- ------------------------------------------------------------------
-- Revogação: idempotente e irreversível.
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.revoke_capability_grant(
  _grant_id uuid,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_now timestamptz := now();
  v_row public.user_capability_grants%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;

  IF NOT ('users.grant_capability' = ANY (public.effective_capabilities(v_actor, v_now))) THEN
    RAISE EXCEPTION 'actor_missing_capability' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_row FROM public.user_capability_grants WHERE id = _grant_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = '22023';
  END IF;

  IF v_row.revoked_at IS NOT NULL THEN
    RETURN false; -- idempotente: já revogada, nada a escrever.
  END IF;

  UPDATE public.user_capability_grants
     SET revoked_at = v_now, revoked_by = v_actor
   WHERE id = _grant_id;

  INSERT INTO public.user_capability_grant_audit
    (grant_id, action, actor_id, user_id, capability, effect, reason, expires_at)
  VALUES (_grant_id, 'revoked', v_actor, v_row.user_id, v_row.capability, v_row.effect,
          NULLIF(btrim(COALESCE(_reason, '')), ''), v_row.expires_at);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.grant_capability(uuid, text, text, text, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_capability_grant(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_capability(uuid, text, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_capability_grant(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.block_capability_audit_mutation() FROM PUBLIC, anon, authenticated;