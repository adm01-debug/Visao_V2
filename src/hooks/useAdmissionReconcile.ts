/**
 * Onda 233 — leitura da conciliação estoque × trilha do livro de admissão.
 *
 * A tela nunca lê a tabela de janelas diretamente (RLS por dono não enxerga o
 * estoque global). Quem inventaria é `admission_ledger_reconcile`, SECURITY
 * DEFINER, e o veredito é recalculado no cliente pela mesma régua pura —
 * assim uma divergência entre banco e régua fica visível em vez de silenciosa.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  reconcileAdmissionLedger,
  type RawInventoryRow,
  type ReconcileSnapshot,
} from '@/lib/alarms/admissionReconciliation';
import type { PurgeRunReading } from '@/lib/alarms/admissionPurgeHistory';

const KEY = ['maintenance', 'admission-ledger-reconcile'] as const;

/** Prazo declarado da guarda de retenção (Onda 230). */
const RETENTION_DAYS = 365;

export interface UseAdmissionReconcileResult {
  readonly snapshot: ReconcileSnapshot;
  readonly isLoading: boolean;
  readonly isError: boolean;
  /** Veredito calculado pelo próprio banco — comparado ao da régua. */
  readonly sqlVerdict: string | null;
  readonly refetch: () => void;
}

interface ReconcileRpcResult extends RawInventoryRow {
  readonly ok?: unknown;
  readonly refusal?: unknown;
  readonly verdict?: unknown;
}

export function useAdmissionReconcile(
  lastValidRun: PurgeRunReading | null
): UseAdmissionReconcileResult {
  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<ReconcileRpcResult | null> => {
      const { data, error } = await supabase.rpc('admission_ledger_reconcile', {
        p_retention_days: RETENTION_DAYS,
      } as never);
      if (error) throw error;
      const row = data as unknown as ReconcileRpcResult | null;
      return row && row.ok === true ? row : null;
    },
    staleTime: 60_000,
  });

  const snapshot = useMemo(
    () => reconcileAdmissionLedger(query.data ?? null, lastValidRun),
    [query.data, lastValidRun]
  );

  const sqlVerdict = useMemo(() => {
    const v = query.data?.verdict;
    return typeof v === 'string' ? v : null;
  }, [query.data]);

  return {
    snapshot,
    isLoading: query.isLoading,
    isError: query.isError,
    sqlVerdict,
    refetch: () => {
      void query.refetch();
    },
  };
}
