/**
 * Onda 246 — leitura da prova de entrega do despachante.
 *
 * A tabela `maintenance_dispatch_runs` é append-only e visível apenas a
 * administradores (RLS `has_role(auth.uid(), 'admin')`). O hook lê as **linhas
 * cruas** e recalcula o veredito com a mesma régua pura usada no teste e na
 * simulação: nenhum agregado pronto vem do banco, para que divergência entre
 * banco e régua vire tela em vez de silêncio.
 *
 * A contagem de críticos abertos vem separada, da própria fonte dos alertas —
 * um número que a execução não conseguiu ler jamais vira zero (V10).
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  assessDeliverability,
  type DeliverabilityVerdict,
  type DispatchRunRow,
} from '@/lib/maintenance/dispatchDeliverability';

const KEY = ['maintenance', 'dispatch-runs'] as const;

/** Quantas execuções recentes bastam para julgar tendência sem paginar. */
const RUN_SAMPLE = 24;

export interface UseDispatchDeliverabilityResult {
  readonly verdict: DeliverabilityVerdict;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly refetch: () => void;
}

interface Payload {
  readonly runs: DispatchRunRow[];
  /** `null` quando a contagem não pôde ser lida — nunca coagido a zero. */
  readonly openCritical: number | null;
}

function toRuns(raw: unknown): DispatchRunRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const num = (value: unknown): number | null =>
      typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : null;
    return {
      ran_at: typeof row.ran_at === 'string' ? row.ran_at : null,
      channels: Array.isArray(row.channels) ? (row.channels as string[]) : null,
      candidates: num(row.candidates),
      planned: num(row.planned),
      sent: num(row.sent),
      failed: num(row.failed),
      skipped: num(row.skipped),
      throttled: num(row.throttled),
      outcome: typeof row.outcome === 'string' ? row.outcome : null,
    } satisfies DispatchRunRow;
  });
}

export function useDispatchDeliverability(): UseDispatchDeliverabilityResult {
  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Payload> => {
      const runsResult = await supabase
        .from('maintenance_dispatch_runs' as never)
        .select('ran_at, channels, candidates, planned, sent, failed, skipped, throttled, outcome')
        .order('ran_at', { ascending: false })
        .limit(RUN_SAMPLE);
      if (runsResult.error) throw runsResult.error;

      const criticalResult = await supabase
        .from('maintenance_alert_events')
        .select('id', { count: 'exact', head: true })
        .eq('severity', 'critical')
        .is('acknowledged_at', null);

      return {
        runs: toRuns(runsResult.data),
        // Falha de leitura é ignorância declarada, não ausência de críticos.
        openCritical: criticalResult.error ? null : (criticalResult.count ?? null),
      };
    },
    staleTime: 60_000,
    retry: false,
  });

  const verdict = useMemo(
    () => assessDeliverability(query.data?.runs ?? [], query.data?.openCritical ?? null, Date.now()),
    [query.data],
  );

  return {
    verdict,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
