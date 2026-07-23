import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RelayAgent {
  id: string;
  name: string;
  last_seen_at: string | null;
  network_cidr: string | null;
}

/**
 * Lista agentes locais com heartbeat recente (< 2 min), ordenados por atividade.
 * Fonte única para todos os seletores de relé (PTZ, port-probe, autodiscover).
 */
export function useActiveRelayAgents(options?: { enabled?: boolean; windowSeconds?: number }) {
  const enabled = options?.enabled ?? true;
  const windowSeconds = options?.windowSeconds ?? 120;

  return useQuery({
    queryKey: ["relay-agents", "active", windowSeconds],
    enabled,
    refetchInterval: 30_000,
    staleTime: 15_000,
    queryFn: async (): Promise<RelayAgent[]> => {
      const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
      const { data, error } = await supabase
        .from("local_agents")
        .select("id, name, last_seen_at, network_cidr")
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as RelayAgent[];
    },
  });
}

const STORAGE_PREFIX = "visao.ptz.relay.";

export function loadPersistedRelayAgent(cameraId: string): string | null {
  if (typeof window === "undefined" || !cameraId) return null;
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + cameraId);
  } catch {
    return null;
  }
}

export function persistRelayAgent(cameraId: string, agentId: string | null): void {
  if (typeof window === "undefined" || !cameraId) return;
  try {
    if (agentId) window.localStorage.setItem(STORAGE_PREFIX + cameraId, agentId);
    else window.localStorage.removeItem(STORAGE_PREFIX + cameraId);
  } catch {
    /* ignore quota / privacy mode */
  }
}
