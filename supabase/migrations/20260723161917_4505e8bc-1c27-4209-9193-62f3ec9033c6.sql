
CREATE TABLE public.connectivity_resolution_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  camera_id uuid REFERENCES public.cameras(id) ON DELETE SET NULL,
  error_code text NOT NULL,
  chosen_path text NOT NULL CHECK (chosen_path IN ('relay','vpn','port_forward','cancelled')),
  relay_agent_id uuid REFERENCES public.local_agents(id) ON DELETE SET NULL,
  public_host text,
  public_port int,
  original_host text,
  original_port int,
  succeeded boolean,
  retry_error_code text,
  duration_ms int,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.connectivity_resolution_telemetry TO authenticated;
GRANT ALL ON public.connectivity_resolution_telemetry TO service_role;

ALTER TABLE public.connectivity_resolution_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own connectivity telemetry"
  ON public.connectivity_resolution_telemetry
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own connectivity telemetry"
  ON public.connectivity_resolution_telemetry
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_conn_res_tel_user_created
  ON public.connectivity_resolution_telemetry (user_id, created_at DESC);
CREATE INDEX idx_conn_res_tel_path_created
  ON public.connectivity_resolution_telemetry (chosen_path, created_at DESC);
CREATE INDEX idx_conn_res_tel_error_created
  ON public.connectivity_resolution_telemetry (error_code, created_at DESC);

CREATE TABLE public.camera_connectivity_preferences (
  camera_id uuid PRIMARY KEY REFERENCES public.cameras(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_path text NOT NULL CHECK (preferred_path IN ('relay','vpn','port_forward','direct')),
  relay_agent_id uuid REFERENCES public.local_agents(id) ON DELETE SET NULL,
  public_host text,
  public_port int,
  last_success_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.camera_connectivity_preferences TO authenticated;
GRANT ALL ON public.camera_connectivity_preferences TO service_role;

ALTER TABLE public.camera_connectivity_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own camera connectivity preferences"
  ON public.camera_connectivity_preferences
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_camera_connectivity_preferences_updated
  BEFORE UPDATE ON public.camera_connectivity_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Retention: 90 days for telemetry
CREATE OR REPLACE FUNCTION public.prune_connectivity_resolution_telemetry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.connectivity_resolution_telemetry
  WHERE created_at < now() - interval '90 days';
END;
$$;
