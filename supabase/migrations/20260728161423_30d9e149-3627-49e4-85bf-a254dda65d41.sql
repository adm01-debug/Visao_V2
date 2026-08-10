CREATE TABLE public.timeline_attestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attestation_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  subject_person_id text,
  subject_label text,
  window_from timestamptz NOT NULL,
  window_to timestamptz NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('corroborated','partial','contested','inconclusive')),
  stays_count integer NOT NULL DEFAULT 0 CHECK (stays_count >= 0),
  confirmed_stays integer NOT NULL DEFAULT 0 CHECK (confirmed_stays >= 0),
  cameras_visited integer NOT NULL DEFAULT 0 CHECK (cameras_visited >= 0),
  confirmed_dwell_ms bigint NOT NULL DEFAULT 0 CHECK (confirmed_dwell_ms >= 0),
  open_floor_ms bigint NOT NULL DEFAULT 0 CHECK (open_floor_ms >= 0),
  excluded_readings integer NOT NULL DEFAULT 0 CHECK (excluded_readings >= 0),
  related_export_root_hash text CHECK (related_export_root_hash IS NULL OR related_export_root_hash ~ '^[0-9a-f]{64}$'),
  root_hash text NOT NULL UNIQUE CHECK (root_hash ~ '^[0-9a-f]{64}$'),
  document jsonb NOT NULL,
  issued_by text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.timeline_attestations IS
  'Onda 201: registro probatorio dos atestados de trajetoria. Append-only; colunas derivadas do documento em SQL.';

CREATE INDEX idx_timeline_attestations_user_issued
  ON public.timeline_attestations (user_id, issued_at DESC);
CREATE INDEX idx_timeline_attestations_subject
  ON public.timeline_attestations (subject_person_id)
  WHERE subject_person_id IS NOT NULL;

REVOKE ALL ON public.timeline_attestations FROM anon;
REVOKE ALL ON public.timeline_attestations FROM authenticated;
GRANT SELECT, INSERT ON public.timeline_attestations TO authenticated;
GRANT ALL ON public.timeline_attestations TO service_role;

ALTER TABLE public.timeline_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_attestations_select" ON public.timeline_attestations
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own_attestations_insert" ON public.timeline_attestations
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Espelho SQL de recomputeVerdictFromDocument (src/lib/faces/timelineAttestation.ts).
-- O banco nunca confia no veredito escrito pelo cliente.
CREATE OR REPLACE FUNCTION public.timeline_attestation_verdict(p_document jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH codes AS (
    SELECT c->>'code' AS code
    FROM jsonb_array_elements(COALESCE(p_document->'caveats', '[]'::jsonb)) AS c
    WHERE COALESCE((c->>'count')::numeric, 0) > 0
  )
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM codes WHERE code IN ('co_presence_conflict','subject_mismatch'))
      THEN 'contested'
    WHEN jsonb_array_length(COALESCE(p_document->'stays', '[]'::jsonb)) = 0
      THEN 'inconclusive'
    WHEN EXISTS (SELECT 1 FROM codes WHERE code IN (
      'unconfirmed_stay','open_stay','blind_gap','excluded_unverified',
      'excluded_spoof_suspect','excluded_unidentified','truncated_result'))
      THEN 'partial'
    ELSE 'corroborated'
  END
$$;

CREATE OR REPLACE FUNCTION public.enforce_timeline_attestation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_doc jsonb := NEW.document;
  v_stats jsonb;
  v_recomputed text;
BEGIN
  IF jsonb_typeof(v_doc) <> 'object' THEN
    RAISE EXCEPTION 'documento_invalido: o atestado precisa ser um objeto JSON';
  END IF;
  IF v_doc->>'format' <> 'visao.timeline.attestation' THEN
    RAISE EXCEPTION 'formato_desconhecido: %', COALESCE(v_doc->>'format', '(vazio)');
  END IF;
  IF v_doc->>'rootHash' IS DISTINCT FROM NEW.root_hash THEN
    RAISE EXCEPTION 'selo_divergente: coluna e documento discordam do rootHash';
  END IF;
  IF v_doc->>'attestationId' IS DISTINCT FROM NEW.attestation_id THEN
    RAISE EXCEPTION 'identificador_divergente: coluna e documento discordam do attestationId';
  END IF;

  v_recomputed := public.timeline_attestation_verdict(v_doc);
  IF v_recomputed IS DISTINCT FROM (v_doc->>'verdict') THEN
    RAISE EXCEPTION 'veredito_forjado: documento declara % mas o conteudo produz %',
      COALESCE(v_doc->>'verdict','(vazio)'), v_recomputed;
  END IF;

  -- Colunas derivadas: o documento e a unica fonte de verdade.
  NEW.verdict := v_recomputed;
  v_stats := COALESCE(v_doc->'stats', '{}'::jsonb);
  NEW.stays_count := COALESCE((v_stats->>'stays')::int, jsonb_array_length(COALESCE(v_doc->'stays','[]'::jsonb)));
  NEW.confirmed_stays := COALESCE((v_stats->>'confirmedStays')::int, 0);
  NEW.cameras_visited := COALESCE((v_stats->>'camerasVisited')::int, 0);
  NEW.confirmed_dwell_ms := COALESCE((v_stats->>'confirmedDwellMs')::bigint, 0);
  NEW.open_floor_ms := COALESCE((v_stats->>'openFloorMs')::bigint, 0);
  NEW.excluded_readings := COALESCE((v_stats->>'excludedReadings')::int, 0);
  NEW.subject_person_id := NULLIF(v_doc#>>'{subject,personId}', '');
  NEW.subject_label := NULLIF(v_doc#>>'{subject,label}', '');
  NEW.related_export_root_hash := NULLIF(v_doc->>'relatedExportRootHash', '');
  NEW.window_from := (v_doc#>>'{window,fromUtc}')::timestamptz;
  NEW.window_to := (v_doc#>>'{window,toUtc}')::timestamptz;
  NEW.issued_by := COALESCE(NULLIF(v_doc#>>'{issuance,issuedBy}',''), NEW.issued_by);
  NEW.issued_at := COALESCE((v_doc#>>'{issuance,issuedAtUtc}')::timestamptz, now());

  IF NEW.window_to < NEW.window_from THEN
    RAISE EXCEPTION 'janela_invertida: fim anterior ao inicio';
  END IF;
  IF NEW.stays_count <> jsonb_array_length(COALESCE(v_doc->'stays','[]'::jsonb)) THEN
    RAISE EXCEPTION 'resumo_divergente: stats.stays nao confere com a lista de permanencias';
  END IF;
  IF NEW.confirmed_stays > NEW.stays_count THEN
    RAISE EXCEPTION 'resumo_divergente: confirmadas acima do total';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_timeline_attestations_enforce
  BEFORE INSERT ON public.timeline_attestations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_timeline_attestation();

CREATE OR REPLACE FUNCTION public.block_timeline_attestation_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'atestado_imutavel: registro probatorio nao pode ser alterado nem removido';
END;
$$;

CREATE TRIGGER trg_timeline_attestations_immutable
  BEFORE UPDATE OR DELETE ON public.timeline_attestations
  FOR EACH ROW EXECUTE FUNCTION public.block_timeline_attestation_mutation();