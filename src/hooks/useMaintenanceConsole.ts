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

const ALERTS_KEY = ['maintenance', 'alerts'] as const;
const RETENTION_KEY = ['maintenance', 'retention-overview'] as const;

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

  const model: MaintenanceConsoleModel = useMemo(
    () => buildMaintenanceConsole(alerts.data ?? [], Date.now()),
    [alerts.data],
  );

  return { alerts, retention, acknowledge, model };
}
