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
 * Somente leitura e restrita a administradores pela própria função do banco;
 * não duplicamos a checagem de papel no cliente para não criar uma segunda
 * fonte de verdade que possa divergir da política do banco.
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
    queryFn: async () => {
      const { data, error } = await supabase.rpc('healing_arbiter_invariants');
      if (error) throw error;

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
