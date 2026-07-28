/**
 * Onda 229 — Leitura do livro de admissão persistido para auditoria visual.
 *
 * Lê apenas as janelas do próprio usuário (RLS) num recorte declarado e devolve
 * o relatório desconfiado da régua `admissionLedgerRows`.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ledgerFromRows,
  summarizeCoverage,
  type AdmissionWindowRow,
  type CoverageSummary,
  type LedgerRowsReport,
} from '@/lib/alarms/admissionLedgerRows';

export interface UseAdmissionCoverageOptions {
  /** Tamanho da janela observada, em horas. */
  readonly hours?: number;
  /** Inventário esperado: origens que deveriam aparecer (silêncio = no_data). */
  readonly expectedSourceIds?: readonly string[];
}

export interface UseAdmissionCoverageResult {
  readonly report: LedgerRowsReport;
  readonly summary: CoverageSummary;
  readonly windowStartAt: number;
  readonly isLoading: boolean;
  readonly error: Error | null;
}

const EMPTY: readonly AdmissionWindowRow[] = [];

export function useAdmissionCoverage(
  options: UseAdmissionCoverageOptions = {},
): UseAdmissionCoverageResult {
  const hours = options.hours && options.hours > 0 ? Math.floor(options.hours) : 24;
  const expected = options.expectedSourceIds ?? EMPTY as unknown as readonly string[];

  // Corte estável por hora: evita refetch a cada render e mantém a auditoria
  // ancorada num instante declarado, nunca em `Date.now()` implícito.
  const windowStartAt = useMemo(() => {
    const now = Date.now();
    return Math.floor(now / 3_600_000) * 3_600_000 - hours * 3_600_000;
  }, [hours]);

  const query = useQuery({
    queryKey: ['admission-ledger', hours, windowStartAt],
    queryFn: async (): Promise<AdmissionWindowRow[]> => {
      const { data, error } = await supabase
        .from('admission_ledger_windows')
        .select(
          'source_id, window_start, window_end, counts, total, admitted, dropped_out_of_window, first_at, last_at',
        )
        .gte('window_end', new Date(windowStartAt).toISOString())
        .order('window_start', { ascending: false })
        .limit(5000);
      if (error) throw new Error(error.message);
      return (data ?? []) as AdmissionWindowRow[];
    },
    staleTime: 60_000,
  });

  const report = useMemo(
    () => ledgerFromRows(query.data ?? EMPTY, { windowStartAt }),
    [query.data, windowStartAt],
  );
  const summary = useMemo(
    () => summarizeCoverage(report, expected),
    [report, expected],
  );

  return {
    report,
    summary,
    windowStartAt,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}
