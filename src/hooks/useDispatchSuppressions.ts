/**
 * Onda 242 — leitura da trilha do ruído evitado.
 *
 * A tabela `maintenance_dispatch_suppressions` não tem Data API: quem lê é a
 * rotina `maintenance_suppression_ledger`, SECURITY DEFINER e restrita a
 * administradores. Ela devolve as **linhas cruas** (nunca um agregado pronto)
 * justamente para que o veredito seja recalculado aqui pela mesma régua pura
 * usada no teste e na simulação — divergência vira tela, não silêncio.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildSuppressionLedger,
  type DeliveryRow,
  type SuppressionLedger,
  type SuppressionRow,
} from '@/lib/maintenance/suppressionLedger';

/** Janela padrão: 7 dias cobre com folga a maior janela de silêncio (1 dia). */
export const SUPPRESSION_WINDOW_HOURS = 168;

const KEY = ['maintenance', 'dispatch-suppressions'] as const;

interface LedgerRpcResult {
  readonly window_hours?: unknown;
  readonly total?: unknown;
  readonly rows?: unknown;
  readonly deliveries?: unknown;
}

export interface UseDispatchSuppressionsResult {
  readonly ledger: SuppressionLedger;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly refetch: () => void;
}

function toSuppressionRows(raw: unknown): SuppressionRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      conditionKey: row.condition_key,
      channel: row.channel,
      severity: row.severity,
      windowMinutes: typeof row.window_minutes === 'number' ? row.window_minutes : undefined,
      suppressedAt: row.suppressed_at,
    } satisfies SuppressionRow;
  });
}

function toDeliveryRows(raw: unknown): DeliveryRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      conditionKey: row.condition_key,
      channel: row.channel,
      sentAt: row.sent_at,
    } satisfies DeliveryRow;
  });
}

export function useDispatchSuppressions(
  windowHours: number = SUPPRESSION_WINDOW_HOURS,
): UseDispatchSuppressionsResult {
  const query = useQuery({
    queryKey: [...KEY, windowHours],
    queryFn: async (): Promise<LedgerRpcResult | null> => {
      const { data, error } = await supabase.rpc('maintenance_suppression_ledger', {
        p_window_hours: windowHours,
      } as never);
      if (error) throw error;
      return (data as unknown as LedgerRpcResult | null) ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });

  const ledger = useMemo(
    () =>
      buildSuppressionLedger(
        toSuppressionRows(query.data?.rows),
        toDeliveryRows(query.data?.deliveries),
        Date.now(),
        typeof query.data?.window_hours === 'number' ? query.data.window_hours : windowHours,
      ),
    [query.data, windowHours],
  );

  return {
    ledger,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: () => {
      void query.refetch();
    },
  };
}
