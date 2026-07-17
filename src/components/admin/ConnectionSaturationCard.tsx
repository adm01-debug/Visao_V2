import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Network, AlertTriangle } from 'lucide-react';

interface AppRow {
  application_name: string;
  total: number;
  active: number;
  idle: number;
  idle_in_tx: number;
  max_idle_secs: number;
}
interface UserRow {
  usename: string;
  total: number;
  active: number;
  idle: number;
  idle_in_tx: number;
}
interface LeakSuspect {
  application_name: string;
  usename: string;
  idle_conns: number;
  oldest_idle_secs: number;
}
interface Saturation {
  max_connections: number;
  superuser_reserved: number;
  available: number;
  summary: {
    total_clients: number;
    active: number;
    idle: number;
    idle_in_tx: number;
    waiting_on_lock: number;
    saturation_pct: number | null;
    severity: 'ok' | 'info' | 'warning' | 'critical';
  };
  by_application: AppRow[];
  by_user: UserRow[];
  leak_suspects: LeakSuspect[];
  generated_at: string;
}

function severityVariant(sev: string): 'default' | 'secondary' | 'destructive' {
  if (sev === 'critical') return 'destructive';
  if (sev === 'warning') return 'secondary';
  return 'default';
}

/**
 * Onda 81 — Monitor de saturação de conexões e detector de leaks.
 */
export function ConnectionSaturationCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['connection-saturation'],
    queryFn: async (): Promise<Saturation> => {
      const { data, error } = await supabase.rpc('get_connection_saturation');
      if (error) throw error;
      return data as unknown as Saturation;
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Network className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Saturação de conexões</CardTitle>
        {data && (
          <Badge variant={severityVariant(data.summary.severity)} className="ml-auto">
            {data.summary.severity.toUpperCase()}
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
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {data.summary.total_clients} / {data.max_connections} conexões
                </span>
                <span className="font-mono text-foreground">
                  {data.summary.saturation_pct ?? 0}%
                </span>
              </div>
              <Progress value={data.summary.saturation_pct ?? 0} className="h-2" />
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="default">active {data.summary.active}</Badge>
                <Badge variant="secondary">idle {data.summary.idle}</Badge>
                <Badge
                  variant={data.summary.idle_in_tx > 5 ? 'destructive' : 'secondary'}
                >
                  idle-tx {data.summary.idle_in_tx}
                </Badge>
                {data.summary.waiting_on_lock > 0 && (
                  <Badge variant="destructive">
                    aguardando lock {data.summary.waiting_on_lock}
                  </Badge>
                )}
              </div>
            </div>

            {data.leak_suspects.length > 0 && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">
                    Suspeitos de leak (idle há &gt; 5min)
                  </span>
                </div>
                <ul className="space-y-1 text-xs">
                  {data.leak_suspects.map((s, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span className="font-mono truncate">
                        {s.application_name} · {s.usename}
                      </span>
                      <span className="text-muted-foreground shrink-0">
                        {s.idle_conns} conns · {Math.round(s.oldest_idle_secs / 60)}min
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="text-sm font-semibold mb-2">Top aplicações</h4>
              <ul className="space-y-1 text-xs">
                {data.by_application.slice(0, 8).map((a, i) => (
                  <li
                    key={i}
                    className="flex justify-between gap-2 border-b border-border/50 pb-1 last:border-0"
                  >
                    <span className="font-mono truncate">{a.application_name}</span>
                    <span className="text-muted-foreground shrink-0">
                      total {a.total} · active {a.active} · idle {a.idle}
                      {a.idle_in_tx > 0 && (
                        <span className="text-destructive"> · idle-tx {a.idle_in_tx}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
