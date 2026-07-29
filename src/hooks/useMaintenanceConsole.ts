/**
 * Onda 136 — dados do console de manutenção.
 *
 * Leitura direta das tabelas (a RLS já restringe a admin) e escrita
 * exclusivamente pelo RPC `acknowledge_maintenance_alert`, que revalida o papel
 * dentro do banco. A tela não é a autoridade: se o RPC recusar, o erro sobe
 * traduzido e a lista é recarregada para refletir o estado real.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  buildMaintenanceConsole,
  type MaintenanceAlertRow,
  type MaintenanceConsoleModel,
} from '@/lib/maintenance/maintenanceConsoleView';

import type { ConditionNoticeRow } from '@/lib/maintenance/conditionSilence';

const ALERTS_KEY = ['maintenance', 'alerts'] as const;
const RETENTION_KEY = ['maintenance', 'retention-overview'] as const;
const DISPATCH_KEY = ['maintenance', 'dispatches'] as const;

/** Linha crua de `public.maintenance_alert_dispatches` (Onda 241). */
interface DispatchRow {
  alert_id: string;
  channel: string;
  status: string;
  last_attempt_at: string | null;
}

export interface RetentionOverviewRow {
  job_name: string;
  label: string;
  cadence_minutes: number;
  last_run: string | null;
  minutes_since_last: number | null;
  hours_since_last: number | null;
  health: string;
  runs_last_30d: number;
  deleted_last_30d: number;
  retention_days: number;
  /** Onda 245 — âncora da carência de estreia; `null` quando não registrada. */
  registered_at: string | null;
  /** Onda 245 — idade do registro em minutos; `null` sem âncora legível. */
  minutes_since_registration: number | null;
  /** Onda 245 — instante em que a carência de estreia vence. */
  debut_due_at: string | null;
}

export function useMaintenanceConsole() {
  const queryClient = useQueryClient();

  const alerts = useQuery({
    queryKey: ALERTS_KEY,
    queryFn: async (): Promise<MaintenanceAlertRow[]> => {
      const { data, error } = await supabase
        .from('maintenance_alert_events')
        .select(
          'id, routine, severity, reason, detail, created_at, observed_at, acknowledged_at, acknowledged_by, escalation_level, last_escalated_at',
        )
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data ?? []) as MaintenanceAlertRow[];
    },
    // O barramento avalia de hora em hora; 60s de frescor evita painel morto
    // sem transformar a tela em polling agressivo.
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const retention = useQuery({
    queryKey: RETENTION_KEY,
    queryFn: async (): Promise<RetentionOverviewRow[]> => {
      const { data, error } = await supabase.rpc('get_retention_overview');
      if (error) throw error;
      return (data ?? []) as RetentionOverviewRow[];
    },
    staleTime: 60_000,
  });

  // Onda 241 — entregas externas recentes, para revelar o silêncio por
  // condição da Onda 240. A janela de leitura (7 dias) cobre com folga a maior
  // janela de silêncio declarada (1 dia) mesmo com o cron parado por dias.
  const dispatches = useQuery({
    queryKey: DISPATCH_KEY,
    queryFn: async (): Promise<DispatchRow[]> => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString();
      const { data, error } = await supabase
        .from('maintenance_alert_dispatches')
        .select('alert_id, channel, status, last_attempt_at')
        .eq('status', 'sent')
        .gte('last_attempt_at', since)
        .order('last_attempt_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      return (data ?? []) as DispatchRow[];
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const acknowledge = useMutation({
    mutationFn: async (alertId: string): Promise<string> => {
      const { data, error } = await supabase.rpc('acknowledge_maintenance_alert', {
        _alert_id: alertId,
      });
      if (error) throw error;
      return String(data);
    },
    // Sucesso ou falha, recarregamos: em falha por perda de papel, a lista
    // precisa parar de oferecer um botão que o banco recusa.
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ALERTS_KEY });
    },
  });

  // R1 — a entrega é registrada por linha de alerta; a condição vem da rotina
  // dessa linha. Despacho cujo alerta não está na janela carregada é
  // descartado: sem a rotina não há condição, e adivinhar seria pior.
  const notices: ConditionNoticeRow[] = useMemo(() => {
    const byAlert = new Map((alerts.data ?? []).map((row) => [row.id, row]));
    const result: ConditionNoticeRow[] = [];
    for (const dispatch of dispatches.data ?? []) {
      const alert = byAlert.get(dispatch.alert_id);
      if (!alert) continue;
      result.push({
        conditionKey: alert.routine,
        channel: dispatch.channel,
        severity: alert.severity,
        status: dispatch.status,
        sentAt: dispatch.last_attempt_at,
      });
    }
    return result;
  }, [alerts.data, dispatches.data]);

  const model: MaintenanceConsoleModel = useMemo(
    () => buildMaintenanceConsole(alerts.data ?? [], Date.now(), undefined, notices),
    [alerts.data, notices],
  );

  return { alerts, retention, dispatches, acknowledge, model };
}
