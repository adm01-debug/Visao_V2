import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { useSlowQueries, type SlowQueryRow } from '@/hooks/useSlowQueries';

function severity(meanMs: number): 'ok' | 'warn' | 'critical' | 'unknown' {
  if (!Number.isFinite(meanMs) || meanMs < 0) return 'unknown';
  if (meanMs < 50) return 'ok';
  if (meanMs < 250) return 'warn';
  return 'critical';
}

function truncateQuery(q: string, max = 140): string {
  if (typeof q !== 'string') return '';
  const s = q.replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export interface SlowQueriesCardProps {
  limit?: number;
  enabled?: boolean;
}

/**
 * Wave 28: Admin card — top slow queries from pg_stat_statements.
 * Renders loading / empty / permission-denied / error / data states without
 * conditional guards elsewhere.
 */
export function SlowQueriesCard({ limit = 20, enabled = true }: SlowQueriesCardProps) {
  const { data, isLoading, isError, error } = useSlowQueries({ limit, enabled });
  const rows: SlowQueryRow[] = data?.rows ?? [];

  const errMsg = (error as Error | undefined)?.message ?? '';
  const isPermission = /401|403|forbidden|unauthorized/i.test(errMsg);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Zap className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Queries mais lentas (top {limit})</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : isPermission ? (
          <p className="text-sm text-muted-foreground">
            Você precisa ser administrador para visualizar esta métrica.
          </p>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar: {errMsg || 'erro desconhecido'}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sem estatísticas no momento. O Postgres coleta métricas em background.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Query</th>
                  <th className="py-2 pr-4 text-right">Chamadas</th>
                  <th className="py-2 pr-4 text-right">Média</th>
                  <th className="py-2 pr-4 text-right">Máx</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2 pr-2">Sev</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const sev = severity(r.mean_ms);
                  const variant =
                    sev === 'critical' ? 'destructive' :
                    sev === 'warn' ? 'secondary' :
                    'default';
                  return (
                    <tr key={i} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-4 font-mono text-xs text-foreground max-w-[42ch]">
                        <code className="whitespace-pre-wrap break-words">{truncateQuery(r.query)}</code>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{r.calls.toLocaleString('pt-BR')}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatMs(r.mean_ms)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatMs(r.max_ms)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{formatMs(r.total_ms)}</td>
                      <td className="py-2 pr-2">
                        <Badge variant={variant}>{sev}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {data?.generated_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            Gerado em {new Date(data.generated_at).toLocaleString('pt-BR')} · auto-refresh 60 s
          </p>
        )}
      </CardContent>
    </Card>
  );
}
