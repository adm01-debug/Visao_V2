import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  evaluateTreatment,
  type AlarmAction,
  type AlarmResolutionCode,
  type AlarmSnapshot,
} from '@/lib/alarms/alarmTreatment';

export interface TreatmentEntry {
  id: string;
  action: AlarmAction;
  from_status: string;
  to_status: string;
  note: string | null;
  resolution_code: AlarmResolutionCode | null;
  actor_id: string;
  acted_at: string;
}

/** Trilha imutável de tratativas de um alarme. */
export function useAlarmTreatments(alertId: string | null) {
  return useQuery({
    queryKey: ['alarm-treatments', alertId],
    enabled: !!alertId,
    staleTime: 15_000,
    queryFn: async (): Promise<TreatmentEntry[]> => {
      const { data, error } = await supabase
        .from('event_alert_treatments')
        .select('id,action,from_status,to_status,note,resolution_code,actor_id,acted_at')
        .eq('alert_id', alertId as string)
        .order('acted_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TreatmentEntry[];
    },
  });
}

export interface TreatArgs {
  alertId: string;
  action: AlarmAction;
  note?: string | null;
  code?: AlarmResolutionCode | null;
  /** Estado atual, usado para a validação local antes da ida ao servidor. */
  snapshot: AlarmSnapshot;
  actorId: string;
}

/**
 * Executa a tratativa. A validação local usa exatamente a mesma regra do
 * servidor: ela existe para dar mensagem imediata ao operador, nunca para
 * substituir a barreira do banco (que é quem realmente decide).
 */
export function useTreatAlarm() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ alertId, action, note, code, snapshot, actorId }: TreatArgs) => {
      const verdict = evaluateTreatment(snapshot, {
        action,
        actorId,
        note: note ?? null,
        code: code ?? null,
        now: Date.now(),
      });
      if (!verdict.ok) throw new Error(verdict.message);

      const { data, error } = await supabase.rpc('treat_event_alert', {
        p_alert_id: alertId,
        p_action: action,
        p_note: note ?? undefined,
        p_code: code ?? undefined,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['event-alerts-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['alarm-treatments', vars.alertId] });
      toast.success('Tratativa registrada');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Não foi possível registrar a tratativa');
    },
  });
}
