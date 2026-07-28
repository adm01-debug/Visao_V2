/**
 * Onda 196 — reputação de obediência ao comando, pronta para a tela.
 *
 * A tela não julga: lê os retratos terminais que a RLS permite (a fila é
 * isolada por dono) e entrega tudo para {@link classifyFleetReliability}, a
 * mesma régua exercitada pela simulação.
 *
 * Duas decisões deliberadas, herdadas das ondas anteriores:
 *
 * 1. **O corte da janela é congelado por busca.** Recalcular `Date.now()` na
 *    renderização faria a amostra encolher entre dois quadros sem nenhum dado
 *    novo — o operador veria o veredito mudar sozinho.
 *
 * 2. **A leitura é dos fatos, não de um agregado pronto.** Estado terminal e
 *    autoria (`settled_by`) são colunas da própria fila; derivar no cliente com
 *    a régua única evita um segundo lugar onde a definição de "silêncio"
 *    poderia divergir.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  classifyFleetReliability,
  summarizeReliability,
  type CommandOutcome,
  type ReliabilitySummary,
  type ReliabilityVerdict,
} from '@/lib/devices/commandReliability';

/** Janela de observação: 30 dias. Série mais antiga descreve outro aparelho. */
export const RELIABILITY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

interface RawCommand {
  registration_id: string;
  command: string;
  status: string;
  settled_by: string | null;
  reported_at: string | null;
  updated_at: string | null;
  created_at: string;
}

const toMillis = (value: string | null): number | null => {
  if (value === null) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const isSettledBy = (value: string | null): value is 'device' | 'sweep' =>
  value === 'device' || value === 'sweep';

export interface CommandReliabilityQuery {
  readonly verdicts: readonly ReliabilityVerdict[];
  readonly summary: ReliabilitySummary;
  readonly evaluatedAt: number | null;
  readonly isLoading: boolean;
  readonly refetch: () => void;
}

export function useCommandReliability(): CommandReliabilityQuery {
  const query = useQuery({
    queryKey: ['command-reliability'],
    staleTime: 60_000,
    queryFn: async () => {
      const evaluatedAt = Date.now();
      const since = new Date(evaluatedAt - RELIABILITY_WINDOW_MS).toISOString();
      const { data, error } = await supabase
        .from('device_remote_commands')
        .select('registration_id, command, status, settled_by, reported_at, updated_at, created_at')
        .in('status', ['completed', 'failed', 'expired', 'cancelled'])
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(2000);

      if (error) throw error;
      return { rows: (data ?? []) as RawCommand[], evaluatedAt };
    },
  });

  const { verdicts, summary } = useMemo(() => {
    const rows = query.data?.rows ?? [];
    const outcomes: CommandOutcome[] = rows.map((r) => ({
      registrationId: r.registration_id,
      command: r.command,
      status: r.status,
      settledBy: isSettledBy(r.settled_by) ? r.settled_by : null,
      // O encerramento é o laudo quando houve laudo; senão, o último toque.
      settledAt: toMillis(r.reported_at) ?? toMillis(r.updated_at) ?? toMillis(r.created_at),
    }));
    const computed = classifyFleetReliability(outcomes, {
      since: (query.data?.evaluatedAt ?? Date.now()) - RELIABILITY_WINDOW_MS,
    });
    return { verdicts: computed, summary: summarizeReliability(computed) };
  }, [query.data]);

  return {
    verdicts,
    summary,
    evaluatedAt: query.data?.evaluatedAt ?? null,
    isLoading: query.isLoading,
    refetch: () => void query.refetch(),
  };
}
