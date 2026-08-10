/**
 * Onda 235 — leitura do histórico persistido de conciliações.
 *
 * A tabela `admission_reconcile_snapshots` não tem Data API (nem `anon` nem
 * `authenticated` a enxergam). Quem lê é a rotina `admission_orphan_trend`,
 * SECURITY DEFINER e restrita a administradores, que devolve a série bruta.
 * O veredito é **recalculado no cliente** pela mesma régua pura: assim uma
 * divergência entre banco e régua aparece na tela em vez de passar batida.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_WINDOW,
  assessOrphanTrend,
  classifyOrphanSeries,
  type OrphanTrendAssessment,
  type ReconcileSnapshotReading,
} from '@/lib/alarms/admissionOrphanTrend';

const KEY = ['maintenance', 'admission-orphan-trend'] as const;

interface TrendRpcResult {
  readonly window?: unknown;
  readonly readable?: unknown;
  readonly series?: unknown;
  readonly last_observed_at?: unknown;
  readonly verdict?: unknown;
}

export interface UseAdmissionOrphanTrendResult {
  readonly assessment: OrphanTrendAssessment;
  readonly isLoading: boolean;
  readonly isError: boolean;
  /** Veredito calculado pelo próprio banco — comparado ao da régua. */
  readonly sqlVerdict: string | null;
  readonly refetch: () => void;
}

/** A série vem do banco já do mais antigo ao mais recente. */
function toReadings(series: readonly unknown[], lastAt: unknown): ReconcileSnapshotReading[] {
  const base = typeof lastAt === 'string' ? Date.parse(lastAt) : Number.NaN;
  const anchor = Number.isFinite(base) ? base : Date.now();
  return series.map((raw, i) => {
    const n = typeof raw === 'number' ? raw : Number(raw);
    const orphan = Number.isInteger(n) && n >= 0 ? n : null;
    // Instantes sintéticos preservam apenas a ORDEM já garantida pelo banco.
    const observedAt = anchor - (series.length - 1 - i) * 86_400_000;
    return {
      id: String(i),
      status: orphan === null ? 'unreadable' : 'valid',
      reason: orphan === null ? 'orphan_count_ilegivel' : null,
      observedAt,
      verdict: 'persisted',
      orphan,
      expired: null,
      deferred: null,
      drift: null,
    } satisfies ReconcileSnapshotReading;
  });
}

export function useAdmissionOrphanTrend(): UseAdmissionOrphanTrendResult {
  const query = useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<TrendRpcResult | null> => {
      const { data, error } = await supabase.rpc('admission_orphan_trend', {
        p_window: DEFAULT_WINDOW,
      } as never);
      if (error) throw error;
      return (data as unknown as TrendRpcResult | null) ?? null;
    },
    staleTime: 60_000,
    retry: false,
  });

  const series = useMemo<unknown[]>(() => {
    const raw = query.data?.series;
    return Array.isArray(raw) ? raw : [];
  }, [query.data]);

  const assessment = useMemo(
    () => assessOrphanTrend(toReadings(series, query.data?.last_observed_at)),
    [series, query.data]
  );

  const sqlVerdict = typeof query.data?.verdict === 'string' ? query.data.verdict : null;

  return {
    assessment,
    isLoading: query.isLoading,
    isError: query.isError,
    sqlVerdict,
    refetch: () => {
      void query.refetch();
    },
  };
}

/** Exportado para teste: garante que a régua local classifica a mesma série. */
export const __localVerdict = classifyOrphanSeries;
