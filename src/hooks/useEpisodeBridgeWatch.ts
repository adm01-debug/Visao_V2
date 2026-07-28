/**
 * Onda 186 — dados do vigia da ponte de episódios para o console de manutenção.
 *
 * A tela não decide nada. Ela lê as execuções recentes do expurgo (a tabela já
 * é admin-only por RLS, então não há RPC nova a criar — criar uma seria ampliar
 * superfície sem ganho) e entrega as amostras cruas para
 * {@link assessEpisodeBridge}, a mesma régua que a rotina SQL espelha. O que o
 * operador lê é, por construção, o mesmo veredito que gera o alerta noturno.
 *
 * Duas decisões deliberadas:
 *
 * 1. **A janela é pedida ao banco, não filtrada no cliente.** Trazer 30 dias e
 *    recortar aqui gastaria banda e abriria espaço para o cliente e o servidor
 *    discordarem sobre o que é "a janela".
 *
 * 2. **O instante de avaliação é congelado por busca.** Usar `Date.now()` na
 *    renderização faria o veredito mudar sozinho entre dois quadros, sem novo
 *    dado — o operador veria o painel "piscar" sem motivo.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TREND_WINDOW_HOURS,
  assessEpisodeBridge,
  type AbandonedSample,
  type BridgeAssessment,
} from '@/lib/retention/episodeBridgeWatch';

interface RawPurgeRun {
  executed_at: string | null;
  abandoned_open: number | null;
}

interface BridgeSnapshot {
  readonly samples: readonly AbandonedSample[];
  /** Instante congelado da leitura — base do veredito. */
  readonly evaluatedAt: number;
}

/**
 * Converte a linha crua. Carimbo ilegível vira `NaN` de propósito: o
 * `sanitize` da régua já descarta leitura inválida, e substituir por
 * `Date.now()` aqui inventaria um dado que o banco não deu.
 */
const toSample = (row: RawPurgeRun): AbandonedSample => ({
  executedAt: row.executed_at === null ? Number.NaN : Date.parse(row.executed_at),
  abandonedOpen: typeof row.abandoned_open === 'number' ? row.abandoned_open : Number.NaN,
});

export interface EpisodeBridgeWatchQuery {
  readonly assessment: BridgeAssessment;
  readonly evaluatedAt: number | null;
  readonly isLoading: boolean;
  readonly error: unknown;
  readonly refetch: () => void;
}

/** Onda 186 — veredito do vigia da ponte, pronto para a tela. */
export function useEpisodeBridgeWatch(): EpisodeBridgeWatchQuery {
  const query = useQuery<BridgeSnapshot>({
    queryKey: ['episode-bridge-watch'],
    // A janela é de 72h e o cron roda de hora em hora: revalidar a cada 5min
    // é folgado o bastante para não martelar o banco e apertado o bastante
    // para o plantão não olhar dado velho.
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<BridgeSnapshot> => {
      const evaluatedAt = Date.now();
      const floor = new Date(evaluatedAt - TREND_WINDOW_HOURS * 3_600_000).toISOString();

      const { data, error } = await supabase
        .from('alarm_recurrence_purge_runs')
        .select('executed_at, abandoned_open')
        .gte('executed_at', floor)
        .order('executed_at', { ascending: true })
        .limit(500);

      if (error) throw error;

      return {
        evaluatedAt,
        samples: ((data ?? []) as RawPurgeRun[]).map(toSample),
      };
    },
  });

  const snapshot = query.data;

  const assessment = useMemo(
    () =>
      // Sem dado carregado, o veredito honesto é "não sei" — e é exatamente o
      // que a régua devolve para uma lista vazia. Nunca fabricamos "saudável".
      assessEpisodeBridge(snapshot?.samples ?? [], snapshot?.evaluatedAt ?? Date.now()),
    [snapshot],
  );

  return {
    assessment,
    evaluatedAt: snapshot?.evaluatedAt ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: () => void query.refetch(),
  };
}
