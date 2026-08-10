CREATE TABLE public.maintenance_dispatch_runs (
  id             bigserial PRIMARY KEY,
  ran_at         timestamptz NOT NULL DEFAULT now(),
  channels       text[]      NOT NULL DEFAULT '{}'::text[],
  candidates     integer     NOT NULL DEFAULT 0,
  planned        integer     NOT NULL DEFAULT 0,
  sent           integer     NOT NULL DEFAULT 0,
  failed         integer     NOT NULL DEFAULT 0,
  skipped        integer     NOT NULL DEFAULT 0,
  throttled      integer     NOT NULL DEFAULT 0,
  open_critical  integer     NOT NULL DEFAULT 0,
  outcome        text        NOT NULL,
  detail         jsonb       NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT maintenance_dispatch_runs_counts_chk CHECK (
    candidates >= 0 AND planned >= 0 AND sent >= 0 AND failed >= 0
    AND skipped >= 0 AND throttled >= 0 AND open_critical >= 0
  ),
  -- V8 — contabilidade fechada: candidato ou virou plano, ou virou descarte.
  CONSTRAINT maintenance_dispatch_runs_closed_chk CHECK (candidates = planned + skipped),
  -- V3 — não se entrega nem se falha mais do que se planejou.
  CONSTRAINT maintenance_dispatch_runs_attempts_chk CHECK (sent + failed <= planned),
  CONSTRAINT maintenance_dispatch_runs_throttled_chk CHECK (throttled <= skipped),
  CONSTRAINT maintenance_dispatch_runs_outcome_chk CHECK (
    outcome IN ('delivered','degraded','failing','muted','idle','error')
  ),
  -- V2 — desfecho "mudo" só existe sem canal, e canal configurado nunca é mudo.
  CONSTRAINT maintenance_dispatch_runs_muted_chk CHECK (
    (outcome = 'muted') = (cardinality(channels) = 0 AND outcome <> 'error')
  )
);

COMMENT ON TABLE public.maintenance_dispatch_runs IS
  'Onda 246 — livro append-only das execuções do despachante externo. Ausencia de linha nunca significa saude; significa que nao houve execucao registrada.';

CREATE INDEX maintenance_dispatch_runs_recent_idx
  ON public.maintenance_dispatch_runs (ran_at DESC, id DESC);

REVOKE ALL ON public.maintenance_dispatch_runs FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.maintenance_dispatch_runs_id_seq FROM anon, authenticated;
GRANT SELECT ON public.maintenance_dispatch_runs TO authenticated;
GRANT ALL ON public.maintenance_dispatch_runs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.maintenance_dispatch_runs_id_seq TO service_role;

ALTER TABLE public.maintenance_dispatch_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_dispatch_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ver execucoes do despachante"
  ON public.maintenance_dispatch_runs
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.block_dispatch_run_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'maintenance_dispatch_runs e append-only (tentativa de %)', TG_OP
    USING ERRCODE = '42501';
END;
$$;

CREATE TRIGGER trg_block_dispatch_run_mutation
  BEFORE UPDATE OR DELETE ON public.maintenance_dispatch_runs
  FOR EACH ROW EXECUTE FUNCTION public.block_dispatch_run_mutation();

-- Autoteste dinamico: cria, viola cada guarda, confere e desfaz tudo.
CREATE OR REPLACE FUNCTION public.dispatch_runs_selftest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id     bigint;
  v_checks jsonb := '[]'::jsonb;
  v_ok     boolean;
BEGIN
  INSERT INTO public.maintenance_dispatch_runs
    (channels, candidates, planned, sent, failed, skipped, throttled, outcome, detail)
  VALUES ('{}'::text[], 0, 0, 0, 0, 0, 0, 'muted', jsonb_build_object('selftest', true))
  RETURNING id INTO v_id;
  v_checks := v_checks || jsonb_build_object('insert_muted', true);

  -- contabilidade aberta deve ser recusada
  BEGIN
    INSERT INTO public.maintenance_dispatch_runs
      (channels, candidates, planned, sent, failed, skipped, outcome)
    VALUES (ARRAY['telegram'], 10, 2, 2, 0, 3, 'delivered');
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_checks := v_checks || jsonb_build_object('rejects_open_accounting', v_ok);

  -- entregar mais do que planejou deve ser recusado
  BEGIN
    INSERT INTO public.maintenance_dispatch_runs
      (channels, candidates, planned, sent, failed, skipped, outcome)
    VALUES (ARRAY['telegram'], 1, 1, 2, 0, 0, 'delivered');
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_checks := v_checks || jsonb_build_object('rejects_overdelivery', v_ok);

  -- canal configurado nao pode ser 'muted'
  BEGIN
    INSERT INTO public.maintenance_dispatch_runs
      (channels, candidates, planned, sent, failed, skipped, outcome)
    VALUES (ARRAY['telegram'], 0, 0, 0, 0, 0, 'muted');
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_checks := v_checks || jsonb_build_object('rejects_muted_with_channel', v_ok);

  -- sem canal e sem erro, o desfecho tem de ser 'muted'
  BEGIN
    INSERT INTO public.maintenance_dispatch_runs
      (channels, candidates, planned, sent, failed, skipped, outcome)
    VALUES ('{}'::text[], 0, 0, 0, 0, 0, 'idle');
    v_ok := false;
  EXCEPTION WHEN check_violation THEN v_ok := true;
  END;
  v_checks := v_checks || jsonb_build_object('rejects_idle_without_channel', v_ok);

  -- imutabilidade
  BEGIN
    UPDATE public.maintenance_dispatch_runs SET sent = 99 WHERE id = v_id;
    v_ok := false;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  v_checks := v_checks || jsonb_build_object('blocks_update', v_ok);

  BEGIN
    DELETE FROM public.maintenance_dispatch_runs WHERE id = v_id;
    v_ok := false;
  EXCEPTION WHEN insufficient_privilege THEN v_ok := true;
  END;
  v_checks := v_checks || jsonb_build_object('blocks_delete', v_ok);

  ALTER TABLE public.maintenance_dispatch_runs DISABLE TRIGGER trg_block_dispatch_run_mutation;
  DELETE FROM public.maintenance_dispatch_runs WHERE id = v_id;
  ALTER TABLE public.maintenance_dispatch_runs ENABLE TRIGGER trg_block_dispatch_run_mutation;

  RETURN jsonb_build_object('ok', NOT (v_checks::text LIKE '%false%'), 'checks', v_checks);
END;
$$;

REVOKE ALL ON FUNCTION public.dispatch_runs_selftest() FROM PUBLIC, anon, authenticated;