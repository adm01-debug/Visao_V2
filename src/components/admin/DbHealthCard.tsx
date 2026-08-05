import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { HeartPulse } from 'lucide-react';

interface Snapshot {
  captured_at: string;
  db_size_bytes: number;
  connections_total: number;
  connections_active: number;
  connections_idle_in_tx: number;
  deadlocks: number;
  xact_rollback: number;
  cache_hit_ratio: number | null;
}

function formatMB(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export function DbHealthCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['db-health-snapshots'],
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from('db_health_snapshots')
        .select(
          'captured_at, db_size_bytes, connections_total, connections_active, connections_idle_in_tx, deadlocks, xact_rollback, cache_hit_ratio'
        )
        .order('captured_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as Snapshot[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const latest = data?.[0];
  const cacheRatio = latest?.cache_hit_ratio ? Number(latest.cache_hit_ratio) : null;
  const cacheBadge: 'default' | 'destructive' | 'secondary' =
    cacheRatio === null
      ? 'secondary'
      : cacheRatio >= 0.98
        ? 'default'
        : cacheRatio >= 0.9
          ? 'secondary'
          : 'destructive';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HeartPulse className="h-4 w-4" aria-hidden="true" />
          Saúde do Banco (últimos snapshots)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Falha ao carregar snapshots.</p>
        ) : !latest ? (
          <p className="text-sm text-muted-foreground">
            Nenhum snapshot ainda. Aguarde a próxima captura.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Tamanho</p>
              <p className="font-semibold">{formatMB(latest.db_size_bytes)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Conexões</p>
              <p className="font-semibold">
                {latest.connections_active} / {latest.connections_total}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Idle em transação</p>
              <p className="font-semibold">{latest.connections_idle_in_tx}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Cache hit</p>
              <Badge variant={cacheBadge}>
                {cacheRatio !== null ? `${(cacheRatio * 100).toFixed(2)}%` : '—'}
              </Badge>
            </div>
            <div>
              <p className="text-muted-foreground">Deadlocks (acum.)</p>
              <p className="font-semibold">{latest.deadlocks}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Rollbacks (acum.)</p>
              <p className="font-semibold">{latest.xact_rollback}</p>
            </div>
            <div className="col-span-2 md:col-span-2">
              <p className="text-muted-foreground">Última captura</p>
              <p className="font-semibold">
                {new Date(latest.captured_at).toLocaleString('pt-BR')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
