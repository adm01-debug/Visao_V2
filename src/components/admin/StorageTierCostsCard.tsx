import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { HardDrive, DollarSign, Archive, Snowflake, Flame } from 'lucide-react';

interface TierStat {
  storage_tier: 'hot' | 'warm' | 'cold' | string;
  retention_class: string;
  asset_count: number;
  total_bytes: number;
  legal_hold_count: number;
  restore_in_progress_count: number;
  oldest_created_at: string | null;
  newest_created_at: string | null;
}

// Preços aproximados (USD/GB/mês) — referência: Supabase, Cloudflare R2, S3 Glacier Deep Archive.
const TIER_PRICE_USD_GB_MONTH: Record<string, number> = {
  hot: 0.021,
  warm: 0.015,
  cold: 0.004,
};

const TIER_LABELS: Record<string, { label: string; icon: typeof Flame; color: string }> = {
  hot: { label: 'Hot (Supabase)', icon: Flame, color: 'text-destructive' },
  warm: { label: 'Warm (R2)', icon: Archive, color: 'text-primary' },
  cold: { label: 'Cold (Glacier)', icon: Snowflake, color: 'text-muted-foreground' },
};

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

function costOf(bytes: number, tier: string): number {
  const gb = Math.max(0, bytes) / 1024 ** 3;
  return gb * (TIER_PRICE_USD_GB_MONTH[tier] ?? 0);
}

export function StorageTierCostsCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['storage-tier-stats'],
    queryFn: async (): Promise<TierStat[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_storage_tier_stats');
      if (error) throw error;
      return (data ?? []) as TierStat[];
    },
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });

  const aggregated = useMemo(() => {
    const acc: Record<string, { bytes: number; count: number; legal: number; restoring: number; cost: number }> = {
      hot: { bytes: 0, count: 0, legal: 0, restoring: 0, cost: 0 },
      warm: { bytes: 0, count: 0, legal: 0, restoring: 0, cost: 0 },
      cold: { bytes: 0, count: 0, legal: 0, restoring: 0, cost: 0 },
    };
    for (const row of data ?? []) {
      const bucket = acc[row.storage_tier] ?? (acc[row.storage_tier] = { bytes: 0, count: 0, legal: 0, restoring: 0, cost: 0 });
      bucket.bytes += Number(row.total_bytes ?? 0);
      bucket.count += Number(row.asset_count ?? 0);
      bucket.legal += Number(row.legal_hold_count ?? 0);
      bucket.restoring += Number(row.restore_in_progress_count ?? 0);
      bucket.cost += costOf(Number(row.total_bytes ?? 0), row.storage_tier);
    }
    const totalMonthlyCost = Object.values(acc).reduce((s, b) => s + b.cost, 0);
    return { acc, totalMonthlyCost };
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5 text-primary" />
          Custos & Consumo por Tier
          <Badge variant="secondary" className="ml-auto flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {aggregated.totalMonthlyCost.toFixed(2)} USD/mês
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Não foi possível carregar as estatísticas de armazenamento.
          </p>
        )}
        {!isLoading && !isError && (
          <div className="grid gap-3 sm:grid-cols-3">
            {(['hot', 'warm', 'cold'] as const).map((tier) => {
              const meta = TIER_LABELS[tier] ?? { label: tier, icon: HardDrive, color: 'text-muted-foreground' };
              const Icon = meta.icon;
              const stats = aggregated.acc[tier] ?? { bytes: 0, count: 0, legal: 0, restoring: 0, cost: 0 };
              return (
                <div key={tier} className="rounded-lg border border-border bg-card p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.color}`} />
                    <span className="text-sm font-medium">{meta.label}</span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Ativos</span>
                      <span className="font-mono text-foreground">{stats.count.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Volume</span>
                      <span className="font-mono text-foreground">{formatBytes(stats.bytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Custo/mês</span>
                      <span className="font-mono text-foreground">${stats.cost.toFixed(2)}</span>
                    </div>
                    {stats.legal > 0 && (
                      <div className="flex justify-between">
                        <span>Legal hold</span>
                        <Badge variant="outline" className="h-4 text-[10px]">{stats.legal}</Badge>
                      </div>
                    )}
                    {stats.restoring > 0 && (
                      <div className="flex justify-between">
                        <span>Restaurando</span>
                        <Badge variant="outline" className="h-4 text-[10px]">{stats.restoring}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Preços de referência: Hot $0.021/GB, Warm $0.015/GB, Cold $0.004/GB por mês.
        </p>
      </CardContent>
    </Card>
  );
}
