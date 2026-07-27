-- Onda 146: causa e responsável na auditoria de erros das Edge Functions.
-- Vocabulários espelham supabase/functions/_shared/networkError.ts e failureBlame.ts.

ALTER TABLE public.edge_function_error_audit
  ADD COLUMN IF NOT EXISTS network_kind text,
  ADD COLUMN IF NOT EXISTS blame text,
  ADD COLUMN IF NOT EXISTS blame_rule text;

-- Vocabulário fechado: um rótulo novo exige migração explícita, nunca um typo.
ALTER TABLE public.edge_function_error_audit
  DROP CONSTRAINT IF EXISTS edge_error_network_kind_chk;
ALTER TABLE public.edge_function_error_audit
  ADD CONSTRAINT edge_error_network_kind_chk
  CHECK (network_kind IS NULL OR network_kind = ANY (ARRAY[
    'timeout','aborted','refused','reset','dns','tls','protocol','redirect_loop','unknown'
  ]));

ALTER TABLE public.edge_function_error_audit
  DROP CONSTRAINT IF EXISTS edge_error_blame_chk;
ALTER TABLE public.edge_function_error_audit
  ADD CONSTRAINT edge_error_blame_chk
  CHECK (blame IS NULL OR blame = ANY (ARRAY[
    'device','transport','config','caller','cloud','unknown'
  ]));

ALTER TABLE public.edge_function_error_audit
  DROP CONSTRAINT IF EXISTS edge_error_blame_rule_chk;
ALTER TABLE public.edge_function_error_audit
  ADD CONSTRAINT edge_error_blame_rule_chk
  CHECK (blame_rule IS NULL OR blame_rule = ANY (ARRAY[
    'R0_caller_aborted','R1_cloud_dependency','R2_upstream_responded','R3_name_resolution',
    'R4_local_reach_proven','R5_remote_path_opaque','R6_deterministic_peer','R7_unknown'
  ]));

-- Coerência: se há responsável, há a regra que o produziu (e vice-versa).
ALTER TABLE public.edge_function_error_audit
  DROP CONSTRAINT IF EXISTS edge_error_blame_pairing_chk;
ALTER TABLE public.edge_function_error_audit
  ADD CONSTRAINT edge_error_blame_pairing_chk
  CHECK ((blame IS NULL) = (blame_rule IS NULL));

-- Índices parciais: os painéis filtram sempre por linhas JÁ classificadas.
CREATE INDEX IF NOT EXISTS idx_edge_error_blame
  ON public.edge_function_error_audit (blame, created_at DESC)
  WHERE blame IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edge_error_network_kind
  ON public.edge_function_error_audit (network_kind, created_at DESC)
  WHERE network_kind IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_edge_error_camera_blame
  ON public.edge_function_error_audit (camera_id, blame, created_at DESC)
  WHERE camera_id IS NOT NULL AND blame IS NOT NULL;

COMMENT ON COLUMN public.edge_function_error_audit.network_kind IS
  'Classe canônica da falha de transporte (Onda 145). NULL quando a falha não foi de rede.';
COMMENT ON COLUMN public.edge_function_error_audit.blame IS
  'Responsável derivado pela regra única de atribuição (Onda 146): device|transport|config|caller|cloud|unknown.';
COMMENT ON COLUMN public.edge_function_error_audit.blame_rule IS
  'Identificador da regra que produziu o responsável — torna a decisão auditável.';