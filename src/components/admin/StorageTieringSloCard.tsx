import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Activity, CheckCircle2, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';

interface SloRow {
  operation: string;
  total_runs: number;
  success_runs: number;
  failed_runs: number;
  success_rate: number | null;
  p50_duration_ms: number | null;
  p95_duration_ms: number | null;
  p99_duration_ms: number | null;
  target_p95_ms: number;
  slo_status: 'ok' | 'risk' | 'violated' | 'no_data';
}

const OP_LABEL: Record<string, string> = {
  'promote-hot-to-warm': 'Promoção Hot → Warm',
  'archive-warm-to-cold': 'Arquivamento Warm → Cold',
  'restore-from-glacier': 'Restauração Glacier',
};

function formatMs(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}min`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function StatusBadge({ status }: { status: SloRow['slo_status'] }) {
  const map = {
    ok: { icon: CheckCircle2, variant: 'default' as const, label: 'OK' },
    risk: { icon: AlertTriangle, variant: 'secondary' as const, label: 'Em risco' },
    violated: { icon: XCircle, variant: 'destructive' as const, label: 'Violado' },
    no_data: { icon: MinusCircle, variant: 'outline' as const, label: 'Sem dados' },
  };
  const { icon: Icon, variant, label } = map[status];
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function StorageTieringSloCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['storage-tiering-slo'],
    queryFn: async (): Promise<SloRow[]> => {
      const { data, error } = await supabase.rpc('get_storage_tiering_slo', { _window_hours: 24 });
      if (error) throw error;
      return (data ?? []) as SloRow[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          SLO de Tiering (últimas 24h)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">Não foi possível carregar métricas de SLO.</p>
        )}
        {!isLoading && !isError && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma métrica coletada ainda.</p>
        )}
        {!isLoading &&
          !isError &&
          (data ?? []).map((row) => {
            const pct =
              row.p95_duration_ms != null
                ? Math.min(100, (row.p95_duration_ms / row.target_p95_ms) * 100)
                : 0;
            return (
              <div key={row.operation} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground">
                      {OP_LABEL[row.operation] ?? row.operation}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {row.total_runs} execuções · {row.success_runs} sucesso · {row.failed_runs}{' '}
                      falha
                      {row.success_rate != null && ` · ${row.success_rate}%`}
                    </p>
                  </div>
                  <StatusBadge status={row.slo_status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">p50</span>
                    <p className="font-mono">{formatMs(row.p50_duration_ms)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">p95</span>
                    <p className="font-mono">{formatMs(row.p95_duration_ms)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">p99</span>
                    <p className="font-mono">{formatMs(row.p99_duration_ms)}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>p95 vs meta ({formatMs(row.target_p95_ms)})</span>
                    <span>{pct.toFixed(0)}%</span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              </div>
            );
          })}
        <p className="text-[11px] text-muted-foreground">
          Metas: Hot→Warm 5min · Warm→Cold 10min · Glacier 12h. Atualiza a cada 60s.
        </p>
      </CardContent>
    </Card>
  );
}
