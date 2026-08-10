/**
 * VISÃO - Modo Teste (Dry-Run)
 *
 * Hook central para iniciar, encerrar e observar sessões de teste.
 * Realiza SELECT/INSERT/UPDATE em `public.test_mode_sessions` respeitando RLS
 * (auth.uid()).
 */

import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type TestModeScope = 'all' | 'camera' | 'rule';
export type TestModeDuration = 5 | 15 | 30 | 60;

export interface TestModeSession {
  id: string;
  user_id: string;
  scope: TestModeScope;
  scope_ids: string[];
  duration_minutes: TestModeDuration;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  ended_reason: 'manual' | 'expired' | 'superseded' | null;
  detections_count: number;
  created_by: string | null;
}

interface StartArgs {
  scope: TestModeScope;
  scopeIds?: string[];
  durationMinutes: TestModeDuration;
}

const QUERY_KEY = ['test-mode', 'sessions', 'active'] as const;

export function useTestMode(options?: { enableRealtime?: boolean }) {
  const enableRealtime = options?.enableRealtime ?? true;
  const qc = useQueryClient();

  const {
    data: activeSession,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<TestModeSession | null> => {
      const { data, error } = await supabase
        .from('test_mode_sessions')
        .select('*')
        .is('ended_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as TestModeSession | null) ?? null;
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });

  // Realtime: acompanha inserts/updates para atualizar banner na hora.
  // Só monta quando habilitado — evita criar N canais duplicados quando
  // `useTestMode` é chamado por vários componentes (ex.: um `TestModeDialog`
  // por regra em /automation-rules).
  useEffect(() => {
    if (!enableRealtime) return;
    const channelName = `test-mode-sessions-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'test_mode_sessions' },
        () => {
          qc.invalidateQueries({ queryKey: ['test-mode'] });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc, enableRealtime]);

  const start = useCallback(
    async ({ scope, scopeIds = [], durationMinutes }: StartArgs) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast.error('Sessão expirada. Faça login novamente.');
        return null;
      }

      if (scope !== 'all' && scopeIds.length === 0) {
        toast.error('Selecione ao menos um item para o escopo do teste.');
        return null;
      }

      // Encerra sessão anterior (uma sessão ativa por vez, por usuário)
      await supabase
        .from('test_mode_sessions')
        .update({ ended_at: new Date().toISOString(), ended_reason: 'superseded' })
        .is('ended_at', null)
        .eq('user_id', userId);

      const expiresAt = new Date(Date.now() + durationMinutes * 60_000).toISOString();

      const { data, error } = await supabase
        .from('test_mode_sessions')
        .insert({
          user_id: userId,
          scope,
          scope_ids: scopeIds,
          duration_minutes: durationMinutes,
          expires_at: expiresAt,
          created_by: userId,
        })
        .select('*')
        .single();

      if (error) {
        toast.error('Não foi possível iniciar o modo teste', { description: error.message });
        return null;
      }

      toast.success(`Modo teste ativo por ${durationMinutes} min`, {
        description:
          scope === 'all'
            ? 'Todas as câmeras e regras em modo dry-run.'
            : `${scopeIds.length} ${scope === 'camera' ? 'câmera(s)' : 'regra(s)'} em dry-run.`,
      });

      await qc.invalidateQueries({ queryKey: ['test-mode'] });
      return data as TestModeSession;
    },
    [qc]
  );

  const stop = useCallback(
    async (sessionId?: string) => {
      const id = sessionId ?? activeSession?.id;
      if (!id) return;
      const { error } = await supabase
        .from('test_mode_sessions')
        .update({ ended_at: new Date().toISOString(), ended_reason: 'manual' })
        .eq('id', id);
      if (error) {
        toast.error('Falha ao encerrar modo teste', { description: error.message });
        return;
      }
      toast.info('Modo teste encerrado');
      await qc.invalidateQueries({ queryKey: ['test-mode'] });
    },
    [activeSession?.id, qc]
  );

  return {
    activeSession: activeSession ?? null,
    isActive: Boolean(activeSession),
    isLoading,
    start,
    stop,
    refetch,
  };
}
