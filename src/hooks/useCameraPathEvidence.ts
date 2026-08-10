/**
 * Onda 153 — Hook que traz a evidência por caminho do banco e a converte no
 * plano de failover da Onda 152.
 *
 * A evidência vem agregada pela RPC `connectivity_path_evidence` (RLS do
 * chamador). O plano é calculado no cliente com a MESMA função pura usada pela
 * borda, então o que a UI mostra é exatamente o que o motor decidiria.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  CONNECTIVITY_PATHS,
  EMPTY_EVIDENCE,
  planFailover,
  type ConnectivityPath,
  type FailoverPlan,
  type FailureKind,
  type PathEvidence,
} from '@/lib/devices/pathFailover';

interface EvidenceRow {
  path: string;
  attempts: number;
  successes: number;
  consecutive_transport_failures: number;
  last_transport_failure_at: string | null;
  last_failure_kind: string;
}

const FAILURE_KINDS: readonly FailureKind[] = ['transport', 'auth', 'config', 'device', 'none'];

function toFailureKind(value: string): FailureKind {
  return FAILURE_KINDS.includes(value as FailureKind) ? (value as FailureKind) : 'none';
}

function isPath(value: string): value is ConnectivityPath {
  return (CONNECTIVITY_PATHS as readonly string[]).includes(value);
}

export interface UseCameraPathEvidenceOptions {
  cameraId: string | null | undefined;
  /** Janela de observação, em minutos. Padrão: 24h. */
  windowMinutes?: number;
  /** Caminho pedido pelo humano; padrão `direct`. */
  preferredPath?: ConnectivityPath;
  /** Caminhos configurados; padrão: todos. */
  configuredPaths?: readonly ConnectivityPath[];
}

export interface CameraPathEvidenceResult {
  evidence: Partial<Record<ConnectivityPath, PathEvidence>>;
  plan: FailoverPlan;
  isLoading: boolean;
  isError: boolean;
}

export function useCameraPathEvidence({
  cameraId,
  windowMinutes = 1440,
  preferredPath = 'direct',
  configuredPaths = CONNECTIVITY_PATHS,
}: UseCameraPathEvidenceOptions): CameraPathEvidenceResult {
  const query = useQuery({
    queryKey: ['connectivity-path-evidence', cameraId, windowMinutes],
    enabled: Boolean(cameraId),
    staleTime: 60_000,
    retry: 1,
    queryFn: async (): Promise<Partial<Record<ConnectivityPath, PathEvidence>>> => {
      const { data, error } = await supabase.rpc('connectivity_path_evidence', {
        p_camera_id: cameraId as string,
        p_window_minutes: windowMinutes,
      });
      if (error) throw error;

      const result: Partial<Record<ConnectivityPath, PathEvidence>> = {};
      for (const row of (data ?? []) as EvidenceRow[]) {
        if (!isPath(row.path)) continue;
        result[row.path] = {
          attempts: row.attempts,
          successes: row.successes,
          consecutiveTransportFailures: row.consecutive_transport_failures,
          lastTransportFailureAtMs: row.last_transport_failure_at
            ? new Date(row.last_transport_failure_at).getTime()
            : null,
          lastFailureKind: toFailureKind(row.last_failure_kind),
        };
      }
      return result;
    },
  });

  const evidence = query.data ?? {};
  const plan = planFailover({ preferredPath, configuredPaths, evidence }, Date.now());

  return {
    evidence,
    plan,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

export { EMPTY_EVIDENCE };
