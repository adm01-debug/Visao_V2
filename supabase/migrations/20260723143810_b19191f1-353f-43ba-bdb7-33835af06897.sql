CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.local_agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  version TEXT,
  network_cidr TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  last_seen_at TIMESTAMPTZ,
  last_ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT local_agents_name_len CHECK (char_length(name) BETWEEN 1 AND 80)
);
CREATE UNIQUE INDEX local_agents_token_hash_idx ON public.local_agents(token_hash);
CREATE INDEX local_agents_user_idx ON public.local_agents(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.local_agents TO authenticated;
GRANT ALL ON public.local_agents TO service_role;
ALTER TABLE public.local_agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own agents select" ON public.local_agents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own agents insert" ON public.local_agents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own agents update" ON public.local_agents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own agents delete" ON public.local_agents FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.agent_discoveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES public.local_agents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  manufacturer TEXT,
  model TEXT,
  firmware TEXT,
  onvif_endpoint TEXT,
  rtsp_primary TEXT,
  rtsp_substream TEXT,
  ptz_capable BOOLEAN NOT NULL DEFAULT false,
  raw JSONB,
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agent_discoveries_port_range CHECK (port BETWEEN 1 AND 65535)
);
CREATE UNIQUE INDEX agent_discoveries_unique_idx ON public.agent_discoveries(agent_id, host, port);
CREATE INDEX agent_discoveries_user_idx ON public.agent_discoveries(user_id, discovered_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_discoveries TO authenticated;
GRANT ALL ON public.agent_discoveries TO service_role;
ALTER TABLE public.agent_discoveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own discoveries select" ON public.agent_discoveries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own discoveries delete" ON public.agent_discoveries FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.tg_local_agents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER local_agents_updated_at BEFORE UPDATE ON public.local_agents
  FOR EACH ROW EXECUTE FUNCTION public.tg_local_agents_updated_at();
CREATE TRIGGER agent_discoveries_updated_at BEFORE UPDATE ON public.agent_discoveries
  FOR EACH ROW EXECUTE FUNCTION public.tg_local_agents_updated_at();

CREATE OR REPLACE FUNCTION public.verify_agent_token(_token TEXT)
RETURNS TABLE(agent_id UUID, agent_user_id UUID)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT id, user_id
  FROM public.local_agents
  WHERE status = 'active'
    AND token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.verify_agent_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_agent_token(TEXT) TO service_role;