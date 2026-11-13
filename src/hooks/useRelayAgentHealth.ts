import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type RelayHealthStatus = 'unknown' | 'online' | 'stale' | 'offline' | 'missing';

export interface RelayHealthState {
  status: RelayHealthStatus;
  ageSeconds: number | null;
  name: string | null;
  networkCidr: string | null;
}

const ONLINE_WINDOW_SEC = 120; // < 2 min → online
const STALE_WINDOW_SEC = 300; // 2–5 min → stale (aviso)

/**
 * Monitora saúde de um Agente Local específico. Diferente de
 * useActiveRelayAgents, aqui buscamos o agente mesmo se ele estiver stale
 * ou offline — para detectar quedas durante uma sessão PTZ ativa.
 */
export function useRelayAgentHealth(
  agentId: string | null,
  options?: { pollMs?: number }
): RelayHealthState {
  const pollMs = options?.pollMs ?? 10_000;

  const { data } = useQuery({
    queryKey: ['relay-agent-health', agentId],
    enabled: !!agentId,
    refetchInterval: pollMs,
    staleTime: pollMs / 2,
    queryFn: async () => {
      if (!agentId) return null;
      const { data, error } = await supabase
        .from('local_agents')
        .select('id, name, last_seen_at, network_cidr')
        .eq('id', agentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!agentId) return { status: 'unknown', ageSeconds: null, name: null, networkCidr: null };
  if (data === null) return { status: 'missing', ageSeconds: null, name: null, networkCidr: null };
  if (!data) return { status: 'unknown', ageSeconds: null, name: null, networkCidr: null };

  const lastSeen = data.last_seen_at ? new Date(data.last_seen_at).getTime() : null;
  const ageSeconds = lastSeen ? Math.floor((Date.now() - lastSeen) / 1000) : null;

  let status: RelayHealthStatus;
  if (ageSeconds === null) status = 'offline';
  else if (ageSeconds <= ONLINE_WINDOW_SEC) status = 'online';
  else if (ageSeconds <= STALE_WINDOW_SEC) status = 'stale';
  else status = 'offline';

  return {
    status,
    ageSeconds,
    name: data.name ?? null,
    networkCidr: data.network_cidr ?? null,
  };
}
