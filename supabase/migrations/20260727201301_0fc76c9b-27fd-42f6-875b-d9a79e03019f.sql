-- Onda 150 — Permissões finas (capabilities) como espelho exato de
-- src/lib/permissions/capabilities.ts. A UI e o banco NÃO podem divergir:
-- a UI esconde botão, o banco é quem realmente autoriza.

CREATE TABLE IF NOT EXISTS public.user_capability_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  capability text NOT NULL,
  effect text NOT NULL CHECK (effect IN ('grant','deny')),
  reason text,
  granted_by uuid,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_capability_grants IS
  'Onda 150: deltas nominais de permissão sobre o piso do papel. Linha vencida ou revogada é prova histórica, nunca regra ativa.';

CREATE INDEX IF NOT EXISTS user_capability_grants_active_idx
  ON public.user_capability_grants (user_id, capability)
  WHERE revoked_at IS NULL;

REVOKE ALL ON public.user_capability_grants FROM anon;
GRANT SELECT ON public.user_capability_grants TO authenticated;
GRANT ALL ON public.user_capability_grants TO service_role;

ALTER TABLE public.user_capability_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own capability grants are readable" ON public.user_capability_grants;
CREATE POLICY "own capability grants are readable"
  ON public.user_capability_grants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "admins manage capability grants" ON public.user_capability_grants;
CREATE POLICY "admins manage capability grants"
  ON public.user_capability_grants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Catálogo fechado. Concessão fora dele é inerte (nunca vira acesso fantasma).
CREATE OR REPLACE FUNCTION public.capability_catalog()
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT ARRAY[
    'cameras.view','cameras.manage','cameras.ptz.control','cameras.ptz.calibrate',
    'recordings.view','recordings.export','recordings.delete',
    'alerts.view','alerts.acknowledge','alerts.dispatch',
    'maintenance.view','maintenance.acknowledge',
    'collab.view','collab.govern',
    'agents.view','agents.heal',
    'users.view','users.manage','users.grant_capability',
    'audit.view'
  ]::text[]
$$;

-- Piso por papel, em cascata explícita (mesma ordem do TypeScript).
CREATE OR REPLACE FUNCTION public.role_baseline_capabilities(_role app_role)
RETURNS text[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  viewer_caps text[] := ARRAY['cameras.view','recordings.view','alerts.view'];
  operator_caps text[] := viewer_caps || ARRAY[
    'cameras.ptz.control','recordings.export','alerts.acknowledge',
    'maintenance.view','collab.view','agents.view'];
  manager_caps text[] := operator_caps || ARRAY[
    'cameras.manage','cameras.ptz.calibrate','alerts.dispatch',
    'maintenance.acknowledge','collab.govern','users.view','audit.view'];
BEGIN
  RETURN CASE _role
    WHEN 'admin' THEN public.capability_catalog()
    WHEN 'manager' THEN manager_caps
    WHEN 'operator' THEN operator_caps
    ELSE viewer_caps
  END;
END;
$$;

-- Papel efetivo: o mais alto que o usuário possui (hierarquia, não ordem alfabética).
CREATE OR REPLACE FUNCTION public.effective_app_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT ur.role
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
    ORDER BY CASE ur.role
      WHEN 'admin' THEN 4 WHEN 'manager' THEN 3 WHEN 'operator' THEN 2 ELSE 1 END DESC
    LIMIT 1
  ), 'viewer'::app_role)
$$;

-- Regra única: piso do papel + concessões ativas − negações ativas,
-- com trava anti-lockout do admin sobre 'users.grant_capability'.
CREATE OR REPLACE FUNCTION public.effective_capabilities(_user_id uuid, _now timestamptz DEFAULT now())
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role app_role;
  v_caps text[];
  v_allowed text[];
  v_denied text[];
BEGIN
  IF _user_id IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  v_role := public.effective_app_role(_user_id);
  v_caps := public.role_baseline_capabilities(v_role);

  SELECT
    COALESCE(array_agg(DISTINCT g.capability) FILTER (WHERE g.effect = 'grant'), ARRAY[]::text[]),
    COALESCE(array_agg(DISTINCT g.capability) FILTER (WHERE g.effect = 'deny'), ARRAY[]::text[])
  INTO v_allowed, v_denied
  FROM public.user_capability_grants g
  WHERE g.user_id = _user_id
    AND g.capability = ANY (public.capability_catalog())
    AND (g.revoked_at IS NULL OR g.revoked_at > _now)
    AND (g.expires_at IS NULL OR g.expires_at > _now);

  -- Concessão só entra se não houver negação ativa da mesma capacidade.
  SELECT COALESCE(array_agg(DISTINCT c), ARRAY[]::text[]) INTO v_caps
  FROM (
    SELECT unnest(v_caps || (
      SELECT COALESCE(array_agg(a), ARRAY[]::text[])
      FROM unnest(v_allowed) a
      WHERE NOT (a = ANY (v_denied))
    )) AS c
  ) s
  WHERE NOT (
    s.c = ANY (v_denied)
    AND NOT (v_role = 'admin' AND s.c = 'users.grant_capability')
  );

  RETURN v_caps;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_capability(_user_id uuid, _capability text, _now timestamptz DEFAULT now())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _capability = ANY (public.effective_capabilities(_user_id, _now))
$$;

-- Atalho para o cliente: cada usuário lê apenas as PRÓPRIAS capacidades.
CREATE OR REPLACE FUNCTION public.my_capabilities()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.effective_capabilities(auth.uid(), now())
$$;

REVOKE ALL ON FUNCTION public.effective_capabilities(uuid, timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.has_capability(uuid, text, timestamptz) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.effective_app_role(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_capabilities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.capability_catalog() TO authenticated;