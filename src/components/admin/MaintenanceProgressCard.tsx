import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Wrench } from 'lucide-react';

interface VacuumRow {
  pid: number;
  datname: string;
  relation: string | null;
  phase: string | null;
  heap_blks_total: number | null;
  heap_blks_scanned: number | null;
  heap_blks_vacuumed: number | null;
  index_vacuum_count: number | null;
  scan_pct: number | null;
  runtime_secs: number;
  usename: string | null;
  is_autovacuum: boolean;
}
interface AnalyzeRow {
  pid: number;
  datname: string;
  relation: string | null;
  phase: string | null;
  sample_blks_total: number | null;
  sample_blks_scanned: number | null;
  scan_pct: number | null;
  runtime_secs: number;
  usename: string | null;
  is_autovacuum: boolean;
}
interface MaintenanceProgress {
  vacuums: VacuumRow[];
  analyzes: AnalyzeRow[];
  autovacuum_workers_active: number;
  autovacuum_max_workers: number;
  workers_saturation_pct: number;
  generated_at: string;
}

/**
 * Onda 82 — Monitor de progresso de VACUUM/ANALYZE em tempo real.
 */
export function MaintenanceProgressCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['maintenance-progress'],
    queryFn: async (): Promise<MaintenanceProgress> => {
      const { data, error } = await supabase.rpc('get_maintenance_progress');
      if (error) throw error;
      return data as unknown as MaintenanceProgress;
    },
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const workerSat = data?.workers_saturation_pct ?? 0;
  const workerVariant: 'default' | 'secondary' | 'destructive' =
    workerSat >= 80 ? 'destructive' : workerSat >= 50 ? 'secondary' : 'default';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Wrench className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Manutenção em andamento (VACUUM / ANALYZE)</CardTitle>
        {data && (
          <Badge variant={workerVariant} className="ml-auto">
            {data.autovacuum_workers_active}/{data.autovacuum_max_workers} workers
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            {(error as Error)?.message ?? 'erro desconhecido'}
          </p>
        ) : !data ? null : (
          <>
            <div>
              <h4 className="text-sm font-semibold mb-2">
                VACUUM ({data.vacuums.length})
              </h4>
              {data.vacuums.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum VACUUM em execução. ✅
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.vacuums.map((v) => (
                    <li
                      key={v.pid}
                      className="border-b border-border/50 pb-2 last:border-0 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-foreground truncate">
                          pid {v.pid} · {v.relation ?? '—'}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {v.is_autovacuum && <Badge variant="secondary">auto</Badge>}
                          <Badge variant="default">{v.runtime_secs.toFixed(0)}s</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Fase: <span className="font-mono">{v.phase ?? '—'}</span>
                        {v.index_vacuum_count && v.index_vacuum_count > 0 && (
                          <span> · índices: {v.index_vacuum_count}</span>
                        )}
                      </p>
                      {v.scan_pct !== null && (
                        <>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {v.heap_blks_scanned}/{v.heap_blks_total} blocos
                            </span>
                            <span className="font-mono">{v.scan_pct}%</span>
                          </div>
                          <Progress value={v.scan_pct} className="h-1.5" />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-2">
                ANALYZE ({data.analyzes.length})
              </h4>
              {data.analyzes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum ANALYZE em execução. ✅
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.analyzes.map((a) => (
                    <li
                      key={a.pid}
                      className="border-b border-border/50 pb-2 last:border-0 text-sm"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-mono text-xs text-foreground truncate">
                          pid {a.pid} · {a.relation ?? '—'}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {a.is_autovacuum && <Badge variant="secondary">auto</Badge>}
                          <Badge variant="default">{a.runtime_secs.toFixed(0)}s</Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Fase: <span className="font-mono">{a.phase ?? '—'}</span>
                      </p>
                      {a.scan_pct !== null && (
                        <>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">
                              {a.sample_blks_scanned}/{a.sample_blks_total} amostras
                            </span>
                            <span className="font-mono">{a.scan_pct}%</span>
                          </div>
                          <Progress value={a.scan_pct} className="h-1.5" />
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Auto-refresh 10s · Gerado em{' '}
              {new Date(data.generated_at).toLocaleString('pt-BR')}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
