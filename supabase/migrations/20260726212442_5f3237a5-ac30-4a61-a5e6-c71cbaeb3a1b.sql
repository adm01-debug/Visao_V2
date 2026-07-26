-- Onda 131 — Silenciamento de avisos da rede colaborativa.

CREATE OR REPLACE FUNCTION public.collab_silence_policy()
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT jsonb_build_object(
    'maxSilenceDays', 90,
    'allowIndefinite', false,
    'maxSilencedKinds', 6
  )
$$;

-- Acionável ou crítico jamais silencia: convite vence sozinho e perda de
-- acesso não pode virar surpresa.
CREATE OR REPLACE FUNCTION public.collab_notification_silenceable(p_kind text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT p_kind IN (
    'invite_accepted','invite_declined','invite_revoked','invite_expired',
    'membership_suspended','membership_reinstated'
  )
$$;

CREATE OR REPLACE FUNCTION public.collab_normalize_silenced_kinds(p_kinds text[])
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT array_agg(DISTINCT k ORDER BY k)
       FROM unnest(COALESCE(p_kinds, ARRAY[]::text[])) AS k
      WHERE public.collab_notification_silenceable(k)),
    ARRAY[]::text[])
$$;

CREATE TABLE IF NOT EXISTS public.collab_notification_silences (
  user_id uuid NOT NULL,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  silenced_kinds text[] NOT NULL,
  silenced_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, organization_id),
  CONSTRAINT collab_silences_kinds_not_empty CHECK (array_length(silenced_kinds, 1) IS NOT NULL)
);

GRANT SELECT ON public.collab_notification_silences TO authenticated;
GRANT ALL ON public.collab_notification_silences TO service_role;
-- Default privileges do papel postgres concedem tudo a anon/authenticated:
-- escrita passa exclusivamente por rotina SECURITY DEFINER.
REVOKE ALL ON public.collab_notification_silences FROM anon;
REVOKE ALL ON public.collab_notification_silences FROM PUBLIC;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.collab_notification_silences FROM authenticated;

ALTER TABLE public.collab_notification_silences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collab_silences_select_own"
  ON public.collab_notification_silences FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_collab_silences_updated
  BEFORE UPDATE ON public.collab_notification_silences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Validação por trigger (e não CHECK): a regra depende do relógio.
CREATE OR REPLACE FUNCTION public.collab_silences_validate()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  v_max integer := (public.collab_silence_policy() ->> 'maxSilenceDays')::int;
BEGIN
  NEW.silenced_kinds := public.collab_normalize_silenced_kinds(NEW.silenced_kinds);
  IF array_length(NEW.silenced_kinds, 1) IS NULL THEN
    RAISE EXCEPTION 'collab_silence:silence_no_valid_kind';
  END IF;
  IF NEW.silenced_until IS NULL THEN
    RAISE EXCEPTION 'collab_silence:silence_requires_deadline';
  END IF;
  IF NEW.silenced_until > now() + make_interval(days => v_max) THEN
    RAISE EXCEPTION 'collab_silence:silence_deadline_too_far';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_collab_silences_validate
  BEFORE INSERT OR UPDATE ON public.collab_notification_silences
  FOR EACH ROW EXECUTE FUNCTION public.collab_silences_validate();

-- Escrita: só pelo dono da preferência, e só em organização da qual participa.
CREATE OR REPLACE FUNCTION public.collab_set_notification_silence(
  p_organization_id uuid,
  p_kinds text[],
  p_until timestamptz,
  p_now timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_max integer := (public.collab_silence_policy() ->> 'maxSilenceDays')::int;
  v_kinds text[] := public.collab_normalize_silenced_kinds(p_kinds);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'collab_silence:not_authenticated';
  END IF;
  IF p_organization_id NOT IN (SELECT public.collab_user_orgs(v_user)) THEN
    RAISE EXCEPTION 'collab_silence:not_a_member';
  END IF;
  IF array_length(v_kinds, 1) IS NULL THEN
    RAISE EXCEPTION 'collab_silence:silence_no_valid_kind';
  END IF;
  IF p_until IS NULL THEN
    RAISE EXCEPTION 'collab_silence:silence_requires_deadline';
  END IF;
  IF p_until <= p_now THEN
    RAISE EXCEPTION 'collab_silence:silence_deadline_in_past';
  END IF;
  IF p_until > p_now + make_interval(days => v_max) THEN
    RAISE EXCEPTION 'collab_silence:silence_deadline_too_far';
  END IF;

  INSERT INTO public.collab_notification_silences AS s
    (user_id, organization_id, silenced_kinds, silenced_until)
  VALUES (v_user, p_organization_id, v_kinds, p_until)
  ON CONFLICT (user_id, organization_id) DO UPDATE
     SET silenced_kinds = EXCLUDED.silenced_kinds,
         silenced_until = EXCLUDED.silenced_until;

  RETURN jsonb_build_object(
    'organizationId', p_organization_id,
    'silencedKinds', to_jsonb(v_kinds),
    'silencedUntil', p_until
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.collab_clear_notification_silence(p_organization_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_deleted integer;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'collab_silence:not_authenticated';
  END IF;
  DELETE FROM public.collab_notification_silences
   WHERE user_id = v_user AND organization_id = p_organization_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

-- Contador passa a separar silenciados; o estado efetivo vem do relógio.
DROP FUNCTION IF EXISTS public.collab_unread_counts();
CREATE FUNCTION public.collab_unread_counts(p_now timestamptz DEFAULT now())
RETURNS TABLE(organization_id uuid, unread integer, silenced integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT n.organization_id,
         count(*) FILTER (WHERE NOT muted)::int AS unread,
         count(*) FILTER (WHERE muted)::int AS silenced
    FROM (
      SELECT n.organization_id,
             (public.collab_notification_silenceable(n.kind)
              AND s.user_id IS NOT NULL
              AND n.kind = ANY(s.silenced_kinds)
              AND s.silenced_until > p_now) AS muted
        FROM public.collab_notifications n
        LEFT JOIN public.collab_notification_silences s
               ON s.user_id = auth.uid() AND s.organization_id = n.organization_id
       WHERE auth.uid() IS NOT NULL
         AND n.organization_id IN (SELECT public.collab_user_orgs(auth.uid()))
         AND NOT EXISTS (
           SELECT 1 FROM public.collab_notification_reads r
            WHERE r.notification_id = n.id AND r.user_id = auth.uid())
    ) n
   GROUP BY n.organization_id
$$;

REVOKE ALL ON FUNCTION public.collab_set_notification_silence(uuid, text[], timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_clear_notification_silence(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_unread_counts(timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.collab_silences_validate() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.collab_set_notification_silence(uuid, text[], timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collab_clear_notification_silence(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.collab_unread_counts(timestamptz) TO authenticated;