-- Criar tabela de idempotência
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key text PRIMARY KEY,
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Índice para limpeza automática (expiração)
CREATE INDEX IF NOT EXISTS idx_idem_keys_created ON public.idempotency_keys(created_at);

-- Adicionar Optimistic Locking na tabela cameras
ALTER TABLE public.cameras ADD COLUMN IF NOT EXISTS version int NOT NULL DEFAULT 1;

-- Função genérica para incrementar versão e validar concorrência
CREATE OR REPLACE FUNCTION public.bump_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Validar se a versão enviada é a esperada (OLD.version + 1)
  -- Se for o primeiro insert, OLD é null e ignoramos a validação de conflito
  IF TG_OP = 'UPDATE' THEN
    IF NEW.version IS DISTINCT FROM OLD.version + 1 AND NEW.version <> OLD.version THEN
        -- Se NEW.version for igual a OLD.version, o cliente não enviou a versão atualizada, incrementamos automaticamente.
        -- Se NEW.version for diferente de OLD.version + 1, houve um conflito de concorrência.
        IF NEW.version <> OLD.version THEN
            RAISE EXCEPTION 'Conflito de concorrência detectado na tabela % (id: %). Versão esperada: %, recebida: %', TG_TABLE_NAME, OLD.id, OLD.version + 1, NEW.version;
        END IF;
    END IF;
  END IF;

  NEW.version := COALESCE(OLD.version, 0) + 1;
  RETURN NEW;
END;
$$;

-- Criar trigger para cameras
DROP TRIGGER IF EXISTS trg_cameras_bump_version ON public.cameras;
CREATE TRIGGER trg_cameras_bump_version
BEFORE UPDATE ON public.cameras
FOR EACH ROW
EXECUTE FUNCTION public.bump_version();