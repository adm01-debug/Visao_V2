import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Onda 143 — consumo do endpoint protegido `fleet-health`.
 *
 * O endpoint é o contrato estável da saúde da frota (mesmo recorte de RLS da
 * tela, mas agregado no servidor). O hook nunca envia chave: `functions.invoke`
 * anexa o JWT da sessão atual, e o endpoint recusa quem não tiver papel.
 */

export type FleetHealthState = 'online' | 'degraded' | 'offline' | 'unknown';

export interface FleetHealthRow {
  readonly camera_id: string;
  readonly name: string;
  readonly location: string | null;
  readonly camera_status: string | null;
  readonly state: FleetHealthState;
  readonly consecutive_failures: number;
  readonly last_check_at: string | null;
  readonly last_state_change_at: string | null;
  readonly last_latency_ms: number | null;
  readonly last_message: string | null;
}

export interface FleetHealthSummary {
  readonly total: number;
  readonly online: number;
  readonly degraded: number;
  readonly offline: number;
  readonly unknown: number;
  readonly uptime_pct: number;
  readonly avg_latency_ms: number | null;
}

export interface FleetHealthResponse {
  readonly generated_at: string;
  readonly summary: FleetHealthSummary;
  readonly filter: { readonly state: FleetHealthState | null; readonly limit: number };
  readonly truncated: boolean;
  readonly rows: readonly FleetHealthRow[];
}

export interface UseFleetHealthEndpointOptions {
  readonly state?: FleetHealthState;
  readonly limit?: number;
  readonly enabled?: boolean;
}

export function useFleetHealthEndpoint(options: UseFleetHealthEndpointOptions = {}) {
  const { state, limit = 200, enabled = true } = options;

  return useQuery<FleetHealthResponse>({
    queryKey: ['fleet-health-endpoint', state ?? 'all', limit],
    enabled,
    staleTime: 15_000,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (state) params.set('state', state);

      const { data, error } = await supabase.functions.invoke<FleetHealthResponse>(
        `fleet-health?${params.toString()}`,
        { method: 'GET' }
      );

      if (error) throw error;
      if (!data) throw new Error('Resposta vazia do endpoint de saúde da frota.');
      return data;
    },
  });
}
