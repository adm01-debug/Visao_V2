/**
 * Onda 231 — leitura do histórico de expurgo do livro de admissão.
 *
 * A tela nunca interpreta linha crua: tudo passa pela régua pura
 * `readPurgeHistory`, que trata coluna ilegível e espelho divergente.
 * A RLS da tabela já restringe a admin; o hook não presume papel.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  readPurgeHistory,
  type PurgeHistorySnapshot,
  type RawPurgeRunRow,
} from '@/lib/alarms/admissionPurgeHistory';

const KEY = ['maintenance', 'admission-purge-history'] as const;

/** Quantas execuções o painel busca — suficiente para tendência e auditoria. */
const FETCH_LIMIT = 30;

export interface UseAdmissionPurgeHistoryResult {
  readonly snapshot: PurgeHistorySnapshot;
  readonly isLoading: boolean;
  readonly isError: boolean;
  readonly evaluatedAt: number;
  readonly refetch: () => void;
}

export function useAdmissionPurgeHistory(): UseAdmissionPurgeHistoryResult {
  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<RawPurgeRunRow[]> => {
      const { data, error } = await supabase
        .from('admission_ledger_purge_runs')
        .select(
          'id, executed_at, cutoff_at, retention_days, batch_cap, deleted_count, deferred_count, quarantined_count, capped, duration_ms'
        )
        .order('executed_at', { ascending: false })
        .limit(FETCH_LIMIT);

      if (error) throw error;
      return (data ?? []) as RawPurgeRunRow[];
    },
    staleTime: 60_000,
  });

  // A rotina é diária; recalcular o veredito a cada render com `Date.now()`
  // faria o retrato oscilar. Amarramos ao ciclo de dados da consulta.
  const evaluatedAt = useMemo(() => query.dataUpdatedAt || Date.now(), [query.dataUpdatedAt]);

  const snapshot = useMemo(
    () => readPurgeHistory(query.data ?? [], { now: evaluatedAt }),
    [query.data, evaluatedAt]
  );

  return {
    snapshot,
    isLoading: query.isLoading,
    isError: query.isError,
    evaluatedAt,
    refetch: () => {
      void query.refetch();
    },
  };
}
