import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { assessCronFreshness, type FreshnessStatus } from '@/lib/cronSchedule';

export interface CronHealthRow {
  jobname: string;
  schedule: string;
  active: boolean;
  failed_7d: number;
  last_run: string | null;
  last_status: string | null;
}

export interface CronFreshnessEntry extends CronHealthRow, FreshnessStatus {}

interface OperationalMetricsSlice {
  cron_health?: CronHealthRow[];
  generated_at?: string;
}

/**
 * Wave 34 — Hook global de freshness dos crons.
 *
 * - Consulta `get_operational_metrics` (admin-only) via RPC.
 * - Derivar `stale` / `never` / `on_time` por job usando `assessCronFreshness`.
 * - Habilitado somente quando `enabled=true` (páginas admin) para não gerar
 *   requisições 403 em contas sem permissão.
 */
export function useCronFreshness(enabled: boolean) {
  return useQuery({
    queryKey: ['cron-freshness'],
    enabled,
    refetchInterval: 60_000,
    staleTime: 30_000,
    queryFn: async (): Promise<CronFreshnessEntry[]> => {
      const { data, error } = await supabase.rpc('get_operational_metrics');
      if (error) throw error;
      const slice = data as unknown as OperationalMetricsSlice;
      const rows = slice.cron_health ?? [];
      const now = new Date();
      return rows.map((r) => ({ ...r, ...assessCronFreshness(r.schedule, r.last_run, now) }));
    },
  });
}
