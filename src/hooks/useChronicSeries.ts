/**
 * Onda 183 — dados do painel de séries crônicas.
 *
 * A tela não classifica nada: ela pede ao banco as contagens agregadas da
 * janela (`list_alarm_recurrence_series`, que revalida a filiação à
 * organização) e entrega tudo para a regra única de montagem
 * (`buildChronicSeriesBoard`). Assim o veredito exibido é, por construção, o
 * mesmo que qualquer outro consumidor obteria.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildChronicSeriesBoard,
  type ChronicSeriesBoard,
  type SeriesSummaryRow,
} from '@/lib/alarms/chronicSeriesBoard';
import type { RecurrenceSeverity } from '@/lib/alarms/alarmRecurrence';

interface RawSeriesRow {
  series_key: string;
  episodes_in_window: number;
  chatter_in_window: number;
  total_episodes: number;
  peak_severity: string | null;
  is_open: boolean;
  last_opened_at: string | null;
  last_closed_at: string | null;
}

const SEVERITIES: readonly string[] = ['low', 'medium', 'high', 'critical'];

/** Carimbo ausente ou ilegível vira `null` — nunca `Date.now()` (regra 2). */
const toEpoch = (value: string | null): number | null => {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
};

const toSummary = (row: RawSeriesRow): SeriesSummaryRow => ({
  seriesKey: row.series_key,
  episodesInWindow: row.episodes_in_window,
  chatterInWindow: row.chatter_in_window,
  totalEpisodes: row.total_episodes,
  peakSeverity: SEVERITIES.includes(row.peak_severity ?? '')
    ? (row.peak_severity as RecurrenceSeverity)
    : null,
  isOpen: row.is_open === true,
  lastOpenedAt: toEpoch(row.last_opened_at),
  lastClosedAt: toEpoch(row.last_closed_at),
});

export interface ChronicSeriesQuery {
  board: ChronicSeriesBoard;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  /** Instante usado para montar o painel — exibido para o operador. */
  evaluatedAt: number | null;
}

export function useChronicSeries(organizationId: string | null): ChronicSeriesQuery {
  const query = useQuery({
    queryKey: ['alarms', 'chronic-series', organizationId],
    enabled: Boolean(organizationId),
    queryFn: async (): Promise<{ rows: SeriesSummaryRow[]; at: number }> => {
      const { data, error } = await supabase.rpc('list_alarm_recurrence_series', {
        p_organization_id: organizationId as string,
      });
      if (error) throw error;
      return {
        rows: ((data ?? []) as RawSeriesRow[]).map(toSummary),
        // O carimbo é do momento da resposta: a idade exibida acompanha o
        // dado recebido, não o relógio de renderização.
        at: Date.now(),
      };
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const board = useMemo(
    () => buildChronicSeriesBoard(query.data?.rows ?? [], query.data?.at ?? Number.NaN),
    [query.data]
  );

  return {
    board,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => void query.refetch(),
    evaluatedAt: query.data?.at ?? null,
  };
}

/** Primeira organização do usuário — o console de manutenção é por organização. */
export function usePrimaryOrganization(): { organizationId: string | null; isLoading: boolean } {
  const query = useQuery({
    queryKey: ['alarms', 'primary-organization'],
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from('organization_members')
        .select('organization_id')
        .limit(1);
      if (error) throw error;
      return data?.[0]?.organization_id ?? null;
    },
    staleTime: 300_000,
  });
  return { organizationId: query.data ?? null, isLoading: query.isLoading };
}
