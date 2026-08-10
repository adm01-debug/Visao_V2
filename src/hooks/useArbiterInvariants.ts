import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ARBITER_INVARIANT_KEYS,
  buildInvariantRows,
  type ArbiterInvariantKey,
  type ArbiterInvariantResult,
  type ArbiterInvariantRow,
} from '@/lib/agents/arbiterInvariants';

/**
 * Onda 142 — leitura das invariantes estruturais do árbitro em produção.
 *
 * Usa o cliente supabase compartilhado (com retry interno = 0).
 * O queryFn NUNCA rejeita — trata erros internamente.
 */

interface RpcRow {
  invariant_key: string;
  ok: boolean;
  detail: string | null;
}

function isKnownKey(value: string): value is ArbiterInvariantKey {
  return (ARBITER_INVARIANT_KEYS as readonly string[]).includes(value);
}

export function useArbiterInvariants() {
  return useQuery<ArbiterInvariantRow[]>({
    queryKey: ['healing-arbiter-invariants'],
    staleTime: 60_000,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('healing_arbiter_invariants');

      if (error) {
        // Não-admin (403) ou qualquer erro — retorna array vazio.
        // Nunca rejeita, React Query nunca entra em retry/error state.
        return buildInvariantRows([]);
      }

      const results: ArbiterInvariantResult[] = ((data ?? []) as RpcRow[])
        .filter((row) => isKnownKey(row.invariant_key))
        .map((row) => ({
          key: row.invariant_key as ArbiterInvariantKey,
          ok: Boolean(row.ok),
          detail: row.detail ?? 'sem detalhe informado pelo banco',
        }));

      return buildInvariantRows(results);
    },
  });
}
