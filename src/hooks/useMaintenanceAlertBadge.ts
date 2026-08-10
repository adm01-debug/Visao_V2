/**
 * Onda 137 — contagem leve de incidentes de manutenção para a navegação.
 *
 * Consulta separada do console (`useMaintenanceConsole`) de propósito: a
 * sidebar vive em todas as telas e não pode arrastar 200 linhas com detalhe
 * JSONB a cada navegação. Aqui buscamos apenas o mínimo para contar — e apenas
 * para quem tem o papel que pode agir.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import {
  DEFAULT_ESCALATION_THRESHOLDS,
  type MaintenanceSeverity,
} from '@/lib/maintenanceEscalation';
import {
  buildMaintenanceNavBadge,
  type MaintenanceNavBadge,
} from '@/lib/maintenance/maintenanceNavBadge';

interface OpenAlertRow {
  severity: string;
  escalation_level: number;
}

export interface MaintenanceAlertCounts {
  open: number;
  openCritical: number;
  atCeiling: number;
}

export const MAINTENANCE_BADGE_KEY = ['maintenance', 'open-count'] as const;

function summarize(rows: readonly OpenAlertRow[]): MaintenanceAlertCounts {
  let openCritical = 0;
  let atCeiling = 0;

  for (const row of rows) {
    // Severidade desconhecida sobe para crítico: subestimar é o erro caro.
    const severity: MaintenanceSeverity = row.severity === 'warning' ? 'warning' : 'critical';
    if (severity === 'critical') openCritical += 1;
    const level = Number.isFinite(row.escalation_level) ? row.escalation_level : 0;
    if (level >= DEFAULT_ESCALATION_THRESHOLDS.maxLevel[severity]) atCeiling += 1;
  }

  return { open: rows.length, openCritical, atCeiling };
}

export function useMaintenanceAlertBadge(): {
  counts: MaintenanceAlertCounts;
  badge: MaintenanceNavBadge;
} {
  const { isAdmin, loading } = useUserRole();

  const { data } = useQuery({
    queryKey: MAINTENANCE_BADGE_KEY,
    // `enabled` evita disparar a consulta antes de saber o papel e para quem
    // não pode reconhecer — a RLS já barraria, mas requisição inútil é custo.
    enabled: isAdmin && !loading,
    queryFn: async (): Promise<MaintenanceAlertCounts> => {
      const { data: rows, error } = await supabase
        .from('maintenance_alert_events')
        .select('severity, escalation_level')
        .is('acknowledged_at', null)
        .limit(500);

      if (error) throw error;
      return summarize((rows ?? []) as OpenAlertRow[]);
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const counts = data ?? { open: 0, openCritical: 0, atCeiling: 0 };
  const badge = useMemo(() => buildMaintenanceNavBadge(counts, isAdmin), [counts, isAdmin]);

  return { counts, badge };
}
