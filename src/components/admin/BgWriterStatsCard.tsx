import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';

type Severity = 'critical' | 'warning' | 'ok';
interface Recommendation {
  area: string;
  severity: Severity;
  issue: string;
  suggestion: string;
}
interface BgWriterStats {
  generated_at: string;
  hours_since_reset: number | null;
  overall_severity: Severity;
  checkpoints: {
    timed: number;
    requested: number;
    total: number;
    req_ratio_pct: number;
    write_time_ms: number;
    sync_time_ms: number;
    severity: Severity;
  };
  buffers: {
    checkpoint: number;
    bgwriter_clean: number;
    backend: number;
    backend_fsync: number;
    allocated: number;
    maxwritten_clean: number;
    backend_ratio_pct: number;
    severity: Severity;
  };
  wal: {
    records: number;
    full_page_images: number;
    bytes: number;
    buffers_full: number;
    severity: Severity;
  } | null;
  recommendations: Recommendation[];
}

const severityVariant: Record<Severity, 'destructive' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  warning: 'secondary',
  ok: 'outline',
};
const fmt = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
const fmtBytes = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};

export function BgWriterStatsCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-bgwriter-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_bgwriter_stats');
      if (error) throw error;
      return data as unknown as BgWriterStats;
    },
    staleTime: 30_000,
    retry: 1,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-4 w-4" aria-hidden />
              Pressão de Checkpoint & WAL
            </CardTitle>
            <CardDescription>
              Saúde do BGWriter, frequência de checkpoints forçados e uso de WAL buffers.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {data && (
              <Badge variant={severityVariant[data.overall_severity]}>
                {data.overall_severity}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              aria-label="Atualizar estatísticas"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Coletando estatísticas…</p>}
        {error && (
          <p className="text-sm text-destructive">
            Falha ao carregar (requer permissão de administrador).
          </p>
        )}
        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Checkpoints</p>
                <p className="text-lg font-semibold">
                  {fmt(data.checkpoints.total)}{' '}
                  <span className="text-xs text-muted-foreground font-normal">total</span>
                </p>
                <p className="text-xs mt-1">
                  Forçados:{' '}
                  <span
                    className={
                      data.checkpoints.req_ratio_pct > 20 ? 'text-destructive font-medium' : ''
                    }
                  >
                    {data.checkpoints.req_ratio_pct}%
                  </span>{' '}
                  ({fmt(data.checkpoints.requested)})
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">Escritas por backend</p>
                <p className="text-lg font-semibold">
                  <span className={data.buffers.backend_ratio_pct > 25 ? 'text-destructive' : ''}>
                    {data.buffers.backend_ratio_pct}%
                  </span>
                </p>
                <p className="text-xs mt-1 text-muted-foreground">
                  fsync backend: {fmt(data.buffers.backend_fsync)}
                </p>
              </div>
              <div className="rounded-md border border-border p-3">
                <p className="text-xs text-muted-foreground">WAL</p>
                <p className="text-lg font-semibold">{data.wal ? fmtBytes(data.wal.bytes) : '—'}</p>
                <p className="text-xs mt-1 text-muted-foreground">
                  {data.wal
                    ? `buffers_full: ${fmt(data.wal.buffers_full)}`
                    : 'pg_stat_wal indisponível'}
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Janela: {data.hours_since_reset ?? '—'}h desde último reset · gerado{' '}
              {new Date(data.generated_at).toLocaleTimeString('pt-BR')}
            </div>

            {data.recommendations.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden />
                  Recomendações de tuning
                </p>
                <ul className="space-y-2">
                  {data.recommendations.map((r, i) => (
                    <li key={i} className="rounded-md border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono uppercase text-muted-foreground">
                          {r.area}
                        </span>
                        <Badge variant={severityVariant[r.severity]} className="text-[10px]">
                          {r.severity}
                        </Badge>
                      </div>
                      <p className="text-sm">{r.issue}</p>
                      <p className="text-xs text-muted-foreground mt-1">💡 {r.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma pressão detectada. BGWriter e WAL estão saudáveis. ✅
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
