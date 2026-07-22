/**
 * VISÃO - Modo Teste (Dry-Run)
 *
 * Helper para consultar se uma detecção deve pular side-effects (Telegram,
 * webhook, e-mail, panic, alerts definitivos) e ser gravada apenas como
 * "sombra" (`is_test=true`).
 *
 * Uso:
 *   const active = await isTestModeActive({ cameraId, ruleId });
 *   if (active) {
 *     // marcar is_test=true nos inserts e NÃO invocar notificações
 *   }
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestModeCheck {
  cameraId?: string | null;
  ruleId?: string | null;
}

/**
 * Consulta direta (sem cache) — use dentro de handlers de detecção.
 */
export async function isTestModeActive({ cameraId, ruleId }: TestModeCheck): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase.rpc('is_test_mode_active', {
    _user_id: userId,
    _camera_id: cameraId ?? undefined,
    _rule_id: ruleId ?? undefined,
  });


  if (error) {
    // Fail-safe: em caso de erro, assumir que NÃO está em modo teste
    // para não silenciar alertas reais indevidamente.
    return false;
  }
  return Boolean(data);
}

/**
 * Hook com React Query para consumo em componentes (banner, badges, etc).
 */
export function useTestModeStatus(scope: TestModeCheck = {}) {
  return useQuery({
    queryKey: ['test-mode', 'active', scope.cameraId ?? 'any', scope.ruleId ?? 'any'],
    queryFn: () => isTestModeActive(scope),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
