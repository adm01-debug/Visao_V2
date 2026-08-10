/**
 * Onda 139 — contagem leve de avisos colaborativos para a navegação.
 *
 * Separado de `useCollabNotifications` de propósito: a caixa de entrada busca
 * 50 linhas com detalhe por rede, e a navegação vive em todas as telas. Aqui
 * chamamos a rotina `SECURITY DEFINER` que já agrega no servidor — uma ida ao
 * banco, poucas linhas (uma por organização).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  buildCollabNavBadge,
  summarizeCollabUnread,
  type CollabNavBadge,
  type CollabUnreadRow,
  type CollabUnreadSummary,
} from '@/lib/collab/collabNavBadge';

export const COLLAB_UNREAD_KEY = ['collab', 'unread-counts'] as const;

const ZERO: CollabUnreadSummary = {
  unread: 0,
  silenced: 0,
  actionable: 0,
  critical: 0,
  oldestAgeHours: null,
  organizations: 0,
};

export function useCollabUnreadBadge(): {
  summary: CollabUnreadSummary;
  badge: CollabNavBadge;
} {
  const { data } = useQuery({
    queryKey: COLLAB_UNREAD_KEY,
    queryFn: async (): Promise<CollabUnreadRow[]> => {
      // Sem sessão a rotina devolveria vazio de qualquer forma; evitamos a ida.
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];

      const { data: rows, error } = await supabase.rpc('collab_unread_counts');
      if (error) throw error;
      return (rows ?? []) as CollabUnreadRow[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  // `summarize` usa o relógio local; recalcular a cada render mantém a idade
  // do item mais antigo viva mesmo sem refetch.
  const summary = useMemo(() => (data ? summarizeCollabUnread(data) : ZERO), [data]);
  const badge = useMemo(() => buildCollabNavBadge(summary), [summary]);

  return { summary, badge };
}
