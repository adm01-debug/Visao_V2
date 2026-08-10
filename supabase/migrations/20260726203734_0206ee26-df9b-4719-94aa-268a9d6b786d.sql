-- =====================================================================
-- Onda 127 — Rede colaborativa de placas entre organizações
-- Espelho SQL de src/lib/collab/collabNetwork.ts (gate: check-collab-network.mjs)
-- =====================================================================

-- ---------------------------------------------------------------- tabelas
CREATE TABLE public.collab_networks (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL CHECK (btrim(name) <> ''),
  slug                 text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{3,60}$'),
  owner_org_id         uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  reciprocity_required boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- Chave HMAC por rede. Tabela SEM nenhum grant: só rotinas SECURITY DEFINER
-- alcançam. Se a chave vazasse, um adversário reconstruiria as placas por força
-- bruta (o espaço de placas brasileiras é pequeno demais para resistir).
CREATE TABLE public.collab_network_secrets (
  network_id uuid PRIMARY KEY REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  hmac_key   bytea NOT NULL DEFAULT gen_random_bytes(32),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.collab_memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id      uuid NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'active', 'suspended')),
  shares_data     boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (network_id, organization_id)
);

CREATE TABLE public.collab_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id   uuid NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  owner_org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plate_hash   bytea NOT NULL,
  severity     smallint NOT NULL CHECK (severity BETWEEN 2 AND 5),
  reason       text NOT NULL CHECK (btrim(reason) <> '' AND length(reason) <= 400),
  expires_at   timestamptz NOT NULL,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Uma organização não duplica a mesma placa viva na mesma rede.
CREATE UNIQUE INDEX collab_entries_live_uniq
  ON public.collab_entries (network_id, owner_org_id, plate_hash)
  WHERE revoked_at IS NULL;

CREATE INDEX collab_entries_lookup
  ON public.collab_entries (network_id, plate_hash)
  WHERE revoked_at IS NULL;

CREATE TABLE public.collab_matches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id     uuid NOT NULL REFERENCES public.collab_networks(id) ON DELETE CASCADE,
  entry_id       uuid NOT NULL REFERENCES public.collab_entries(id) ON DELETE CASCADE,
  reader_org_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  camera_id      uuid REFERENCES public.cameras(id) ON DELETE SET NULL,
  severity       smallint NOT NULL CHECK (severity BETWEEN 2 AND 5),
  confidence     numeric(4, 3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  matched_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX collab_matches_cooldown
  ON public.collab_matches (entry_id, reader_org_id, matched_at DESC);

CREATE INDEX collab_matches_reader
  ON public.collab_matches (reader_org_id, matched_at DESC);

-- ------------------------------------------------------------- privilégios
-- Os default privileges do papel postgres reconcedem TUDO a authenticated no
-- CREATE TABLE. Revogar nominalmente antes de conceder o conjunto exato.
REVOKE ALL ON public.collab_networks         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.collab_network_secrets  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.collab_memberships      FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.collab_entries          FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.collab_matches          FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.collab_networks    TO authenticated;
GRANT SELECT ON public.collab_memberships TO authenticated;
GRANT SELECT ON public.collab_entries     TO authenticated;
GRANT SELECT ON public.collab_matches     TO authenticated;

GRANT ALL ON public.collab_networks        TO service_role;
GRANT ALL ON public.collab_network_secrets TO service_role;
GRANT ALL ON public.collab_memberships     TO service_role;
GRANT ALL ON public.collab_entries         TO service_role;
GRANT ALL ON public.collab_matches         TO service_role;

ALTER TABLE public.collab_networks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_network_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_memberships     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_entries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collab_matches         ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------- política base
CREATE OR REPLACE FUNCTION public.collab_policy()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'defaultTtlDays', 30,
    'maxTtlDays', 180,
    'minSeverity', 2,
    'maxSeverity', 5,
    'matchCooldownSeconds', 900,
    'maxActiveEntriesPerOrg', 5000,
    'minConfidence', 0.6,
    'plateLength', 7
  )
$$;

-- Membro ativo de uma rede? Security definer para não recursar em RLS.
CREATE OR REPLACE FUNCTION public.collab_member_status(_network_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.status
  FROM public.collab_memberships m
  WHERE m.network_id = _network_id
    AND m.organization_id = _org_id
$$;

-- Organizações às quais o usuário atual pertence.
CREATE OR REPLACE FUNCTION public.collab_user_orgs(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id
  FROM public.organization_members om
  WHERE om.user_id = _user_id
$$;

-- ---------------------------------------------------------------- políticas
CREATE POLICY collab_networks_select_members ON public.collab_networks
  FOR SELECT TO authenticated
  USING (
    owner_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.collab_memberships m
      WHERE m.network_id = collab_networks.id
        AND m.organization_id IN (SELECT public.collab_user_orgs(auth.uid()))
    )
  );

CREATE POLICY collab_memberships_select_members ON public.collab_memberships
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT public.collab_user_orgs(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.collab_networks n
      WHERE n.id = collab_memberships.network_id
        AND n.owner_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
    )
  );

-- Entradas: cada organização só enxerga as PRÓPRIAS. Expor o hash alheio
-- permitiria enumerar por força bruta o que os vizinhos marcaram.
CREATE POLICY collab_entries_select_own ON public.collab_entries
  FOR SELECT TO authenticated
  USING (owner_org_id IN (SELECT public.collab_user_orgs(auth.uid())));

-- Alertas: a organização que leu vê o alerta; a dona da entrada vê que houve
-- avistamento, que é justamente o valor da rede.
CREATE POLICY collab_matches_select_parties ON public.collab_matches
  FOR SELECT TO authenticated
  USING (
    reader_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.collab_entries e
      WHERE e.id = collab_matches.entry_id
        AND e.owner_org_id IN (SELECT public.collab_user_orgs(auth.uid()))
    )
  );

-- collab_network_secrets: RLS ligada e NENHUMA política. Fechada por construção.

-- ------------------------------------------------------- canonicalização
CREATE OR REPLACE FUNCTION public.canonical_plate(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  stripped text;
  mask     constant text := 'AAANXNN';
  ch       text;
  slot     text;
  fixed    text;
  out      text := '';
  i        int;
BEGIN
  stripped := upper(regexp_replace(coalesce(_raw, ''), '[^A-Za-z0-9]', '', 'g'));
  IF length(stripped) <> 7 THEN
    RETURN NULL;
  END IF;

  FOR i IN 1..7 LOOP
    ch := substr(stripped, i, 1);
    slot := substr(mask, i, 1);

    IF slot = 'A' THEN
      IF ch ~ '^[A-Z]$' THEN
        fixed := ch;
      ELSE
        fixed := CASE ch
          WHEN '0' THEN 'O' WHEN '1' THEN 'I' WHEN '2' THEN 'Z'
          WHEN '4' THEN 'A' WHEN '5' THEN 'S' WHEN '6' THEN 'G'
          WHEN '8' THEN 'B' ELSE NULL END;
      END IF;
    ELSIF slot = 'N' THEN
      IF ch ~ '^[0-9]$' THEN
        fixed := ch;
      ELSE
        fixed := CASE ch
          WHEN 'O' THEN '0' WHEN 'Q' THEN '0' WHEN 'D' THEN '0'
          WHEN 'I' THEN '1' WHEN 'L' THEN '1' WHEN 'Z' THEN '2'
          WHEN 'A' THEN '4' WHEN 'S' THEN '5' WHEN 'G' THEN '6'
          WHEN 'B' THEN '8' ELSE NULL END;
      END IF;
    ELSE
      fixed := ch;
    END IF;

    IF fixed IS NULL THEN
      RETURN NULL;
    END IF;
    out := out || fixed;
  END LOOP;

  RETURN out;
END;
$$;

-- Impressão digital da placa, exclusiva por rede.
CREATE OR REPLACE FUNCTION public.collab_plate_hash(_network_id uuid, _plate text)
RETURNS bytea
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key   bytea;
  v_plate text;
BEGIN
  v_plate := public.canonical_plate(_plate);
  IF v_plate IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT s.hmac_key INTO v_key
  FROM public.collab_network_secrets s
  WHERE s.network_id = _network_id;

  IF v_key IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN extensions.hmac(v_plate::bytea, v_key, 'sha256');
END;
$$;

-- Toda rede nasce com sua chave.
CREATE OR REPLACE FUNCTION public.collab_network_bootstrap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.collab_network_secrets (network_id) VALUES (NEW.id);
  INSERT INTO public.collab_memberships (network_id, organization_id, status, shares_data)
  VALUES (NEW.id, NEW.owner_org_id, 'active', true)
  ON CONFLICT (network_id, organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_collab_network_bootstrap
  AFTER INSERT ON public.collab_networks
  FOR EACH ROW EXECUTE FUNCTION public.collab_network_bootstrap();

CREATE TRIGGER trg_collab_networks_updated
  BEFORE UPDATE ON public.collab_networks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_collab_memberships_updated
  BEFORE UPDATE ON public.collab_memberships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_collab_entries_updated
  BEFORE UPDATE ON public.collab_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- -------------------------------------------------- compartilhar uma placa
CREATE OR REPLACE FUNCTION public.share_collab_plate(
  _network_id uuid,
  _org_id     uuid,
  _plate      text,
  _severity   int,
  _reason     text,
  _ttl_days   int DEFAULT NULL
)
RETURNS TABLE (accepted boolean, entry_id uuid, rejection text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy jsonb := public.collab_policy();
  v_plate  text;
  v_hash   bytea;
  v_status text;
  v_count  int;
  v_ttl    int;
  v_id     uuid;
BEGIN
  -- Ordem deliberada: placa inválida é erro de digitação, não incidente de
  -- associação. Checar a placa primeiro evita relatório enganoso.
  v_plate := public.canonical_plate(_plate);
  IF v_plate IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'invalid_plate'; RETURN;
  END IF;

  v_status := public.collab_member_status(_network_id, _org_id);
  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, 'member_not_active'; RETURN;
  END IF;

  IF _severity IS NULL
     OR _severity < (v_policy->>'minSeverity')::int
     OR _severity > (v_policy->>'maxSeverity')::int THEN
    RETURN QUERY SELECT false, NULL::uuid, 'severity_out_of_range'; RETURN;
  END IF;

  IF _ttl_days IS NOT NULL
     AND (_ttl_days < 1 OR _ttl_days > (v_policy->>'maxTtlDays')::int) THEN
    RETURN QUERY SELECT false, NULL::uuid, 'ttl_out_of_range'; RETURN;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.collab_entries e
  WHERE e.network_id = _network_id
    AND e.owner_org_id = _org_id
    AND e.revoked_at IS NULL
    AND e.expires_at > now();

  IF v_count >= (v_policy->>'maxActiveEntriesPerOrg')::int THEN
    RETURN QUERY SELECT false, NULL::uuid, 'quota_exceeded'; RETURN;
  END IF;

  v_ttl := coalesce(_ttl_days, (v_policy->>'defaultTtlDays')::int);
  v_hash := public.collab_plate_hash(_network_id, v_plate);
  IF v_hash IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, 'invalid_plate'; RETURN;
  END IF;

  INSERT INTO public.collab_entries
    (network_id, owner_org_id, plate_hash, severity, reason, expires_at)
  VALUES
    (_network_id, _org_id, v_hash, _severity::smallint, _reason,
     now() + make_interval(days => v_ttl))
  ON CONFLICT (network_id, owner_org_id, plate_hash) WHERE revoked_at IS NULL
  DO UPDATE SET
    severity   = EXCLUDED.severity,
    reason     = EXCLUDED.reason,
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN QUERY SELECT true, v_id, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_collab_entry(_entry_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE public.collab_entries
  SET revoked_at = now(), updated_at = now()
  WHERE id = _entry_id
    AND owner_org_id = _org_id
    AND revoked_at IS NULL;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- ------------------------------------------------------ conferir uma leitura
CREATE OR REPLACE FUNCTION public.match_collab_plate(
  _network_id  uuid,
  _reader_org  uuid,
  _plate       text,
  _confidence  numeric,
  _camera_id   uuid DEFAULT NULL,
  _at          timestamptz DEFAULT now()
)
RETURNS TABLE (alerted boolean, entry_id uuid, severity smallint, rejection text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_policy   jsonb := public.collab_policy();
  v_plate    text;
  v_hash     bytea;
  v_status   text;
  v_recip    boolean;
  v_shares   boolean;
  v_saw_own  boolean := false;
  v_saw_rev  boolean := false;
  v_saw_exp  boolean := false;
  v_entry    record;
  v_last     timestamptz;
BEGIN
  v_plate := public.canonical_plate(_plate);
  IF v_plate IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'invalid_plate'; RETURN;
  END IF;

  IF _confidence IS NULL OR _confidence < (v_policy->>'minConfidence')::numeric THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'low_confidence'; RETURN;
  END IF;

  v_status := public.collab_member_status(_network_id, _reader_org);
  IF v_status IS DISTINCT FROM 'active' THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'member_not_active'; RETURN;
  END IF;

  SELECT n.reciprocity_required INTO v_recip
  FROM public.collab_networks n WHERE n.id = _network_id;

  SELECT m.shares_data INTO v_shares
  FROM public.collab_memberships m
  WHERE m.network_id = _network_id AND m.organization_id = _reader_org;

  IF coalesce(v_recip, true) AND NOT coalesce(v_shares, false) THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'reciprocity_required'; RETURN;
  END IF;

  v_hash := public.collab_plate_hash(_network_id, v_plate);
  IF v_hash IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'invalid_plate'; RETURN;
  END IF;

  SELECT
    bool_or(e.owner_org_id = _reader_org),
    bool_or(e.owner_org_id <> _reader_org AND e.revoked_at IS NOT NULL AND e.revoked_at <= _at),
    bool_or(e.owner_org_id <> _reader_org
            AND (e.revoked_at IS NULL OR e.revoked_at > _at)
            AND e.expires_at <= _at)
  INTO v_saw_own, v_saw_rev, v_saw_exp
  FROM public.collab_entries e
  WHERE e.network_id = _network_id AND e.plate_hash = v_hash;

  -- Vence a mais severa; empate pela que expira antes; depois por id, para que
  -- o veredito seja determinístico e comparável com o espelho em TypeScript.
  SELECT e.id, e.severity INTO v_entry
  FROM public.collab_entries e
  WHERE e.network_id = _network_id
    AND e.plate_hash = v_hash
    AND e.owner_org_id <> _reader_org
    AND (e.revoked_at IS NULL OR e.revoked_at > _at)
    AND e.expires_at > _at
  ORDER BY e.severity DESC, e.expires_at ASC, e.id ASC
  LIMIT 1;

  IF v_entry IS NULL THEN
    IF coalesce(v_saw_exp, false) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'entry_expired'; RETURN;
    ELSIF coalesce(v_saw_rev, false) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'entry_revoked'; RETURN;
    ELSIF coalesce(v_saw_own, false) THEN
      RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'own_entry'; RETURN;
    END IF;
    RETURN QUERY SELECT false, NULL::uuid, NULL::smallint, 'no_match'; RETURN;
  END IF;

  -- Cooldown é a ÚLTIMA guarda: só silencia o que de fato casou.
  SELECT max(c.matched_at) INTO v_last
  FROM public.collab_matches c
  WHERE c.entry_id = v_entry.id AND c.reader_org_id = _reader_org;

  IF v_last IS NOT NULL
     AND _at - v_last < make_interval(secs => (v_policy->>'matchCooldownSeconds')::int) THEN
    RETURN QUERY SELECT false, v_entry.id, v_entry.severity, 'cooldown'; RETURN;
  END IF;

  INSERT INTO public.collab_matches
    (network_id, entry_id, reader_org_id, camera_id, severity, confidence, matched_at)
  VALUES
    (_network_id, v_entry.id, _reader_org, _camera_id, v_entry.severity,
     least(greatest(_confidence, 0), 1), _at);

  RETURN QUERY SELECT true, v_entry.id, v_entry.severity, NULL::text;
END;
$$;

-- Somente rotinas: nada de execução por anon.
REVOKE ALL ON FUNCTION public.share_collab_plate(uuid, uuid, text, int, text, int) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_collab_entry(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.match_collab_plate(uuid, uuid, text, numeric, uuid, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_plate_hash(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.collab_member_status(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_user_orgs(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.collab_policy() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.canonical_plate(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_member_status(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.collab_user_orgs(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.share_collab_plate(uuid, uuid, text, int, text, int) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_collab_entry(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_collab_plate(uuid, uuid, text, numeric, uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.collab_plate_hash(uuid, text) TO service_role;