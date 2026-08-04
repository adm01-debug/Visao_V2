import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_PRODUCTIVITY_CONFIG,
  fromRow,
  type ProductivityConfig,
} from '@/lib/productivityConfig';

const QUERY_KEY = ['productivity-metric-preferences'] as const;

/**
 * Carrega e persiste no backend, por usuário autenticado, os critérios usados
 * no cálculo das métricas de produtividade. Sem sessão ativa, cai para os
 * valores padrão (somente leitura em memória).
 */
export function useProductivityConfig() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<ProductivityConfig>(DEFAULT_PRODUCTIVITY_CONFIG);

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<{ config: ProductivityConfig; userId: string | null }> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id ?? null;
      if (!userId) return { config: DEFAULT_PRODUCTIVITY_CONFIG, userId: null };

      const { data: row, error } = await supabase
        .from('productivity_metric_preferences')
        .select('event_types, window_start, window_end, weekdays, severities')
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw error;

      return { config: row ? fromRow(row) : DEFAULT_PRODUCTIVITY_CONFIG, userId };
    },
  });

  // Sincroniza o rascunho local sempre que a configuração remota mudar.
  useEffect(() => {
    if (data?.config) setDraft(data.config);
  }, [data?.config]);

  const mutation = useMutation({
    mutationFn: async (config: ProductivityConfig) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('Sessão expirada — faça login novamente para salvar.');

      const { error } = await supabase.from('productivity_metric_preferences').upsert(
        {
          user_id: userId,
          event_types: config.eventTypes,
          window_start: config.windowStart,
          window_end: config.windowEnd,
          weekdays: config.weekdays,
          severities: config.severities,
        },
        { onConflict: 'user_id' }
      );
      if (error) throw error;
      return config;
    },
    onSuccess: (config) => {
      queryClient.setQueryData(QUERY_KEY, (prev: { userId: string | null } | undefined) => ({
        config,
        userId: prev?.userId ?? null,
      }));
    },
  });

  const resetDraft = useCallback(() => {
    setDraft(data?.config ?? DEFAULT_PRODUCTIVITY_CONFIG);
  }, [data?.config]);

  return {
    /** Configuração efetivamente aplicada às métricas. */
    config: data?.config ?? DEFAULT_PRODUCTIVITY_CONFIG,
    /** Rascunho editável no painel, antes de salvar. */
    draft,
    setDraft,
    resetDraft,
    isLoading,
    isSaving: mutation.isPending,
    save: mutation.mutateAsync,
    isAuthenticated: Boolean(data?.userId),
  };
}
