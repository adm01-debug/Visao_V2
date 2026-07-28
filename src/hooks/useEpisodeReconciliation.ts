/**
 * Onda 187 — acionamento da reconciliação a partir do console de manutenção.
 *
 * O hook não decide o que fechar: quem decide é
 * `public.reconcile_abandoned_episodes()`, que espelha
 * `src/lib/retention/episodeReconciliation.ts`. Fazer a seleção aqui e mandar
 * uma lista de ids permitiria que um cliente desatualizado — ou adulterado —
 * fechasse episódios que ainda são alarme em curso. O cliente só pede a
 * execução; o corte é do servidor.
 *
 * Duas consequências deliberadas:
 *
 * 1. **Sem `p_now` vindo do cliente.** O relógio do navegador não pode definir
 *    quais episódios são "antigos o bastante" — seria mover o corte adiantando
 *    a máquina.
 *
 * 2. **Invalidação ampla após sucesso.** A reconciliação muda o denominador do
 *    vigia, do painel de séries crônicas e da trilha de expurgo. Invalidar só o
 *    cartão deixaria o resto da tela contando episódios que já não existem
 *    abertos.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

/** Resultado devolvido pela rotina do servidor. */
export interface ReconciliationResult {
  readonly closed: number;
  readonly deferred: number;
  readonly unreadableClock: number;
  readonly abandonedOpenDays: number;
}

const parseResult = (payload: unknown): ReconciliationResult => {
  const row = (payload ?? {}) as Record<string, unknown>;
  const num = (value: unknown): number => (typeof value === 'number' ? value : 0);
  return {
    closed: num(row.closed),
    deferred: num(row.deferred),
    unreadableClock: num(row.unreadableClock),
    abandonedOpenDays: num(row.abandonedOpenDays),
  };
};

export function useEpisodeReconciliation(organizationId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation<ReconciliationResult, Error, void>({
    mutationFn: async (): Promise<ReconciliationResult> => {
      if (organizationId === null) {
        throw new Error('Organização não identificada.');
      }
      const { data, error } = await supabase.rpc('reconcile_abandoned_episodes', {
        p_organization_id: organizationId,
      });
      if (error) throw new Error(error.message);
      return parseResult(data);
    },
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['episode-bridge-watch'] });
      void queryClient.invalidateQueries({ queryKey: ['alarms'] });

      if (result.closed === 0) {
        toast.info('Nenhum episódio abandonado elegível para reconciliação.');
        return;
      }
      const extra: string[] = [];
      if (result.deferred > 0) extra.push(`${result.deferred} adiado(s) para a próxima execução`);
      if (result.unreadableClock > 0) {
        extra.push(`${result.unreadableClock} com data de abertura inválida, mantido(s) intacto(s)`);
      }
      toast.success(
        `${result.closed} episódio(s) encerrado(s) no corte de ${result.abandonedOpenDays} dias` +
          (extra.length > 0 ? ` — ${extra.join('; ')}.` : '.'),
      );
    },
    onError: (error) => {
      toast.error(`Não foi possível reconciliar: ${error.message}`);
    },
  });

  return {
    reconcile: () => mutation.mutate(),
    isReconciling: mutation.isPending,
    lastResult: mutation.data ?? null,
    canReconcile: organizationId !== null,
  };
}
