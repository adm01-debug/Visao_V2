import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { GitBranch } from 'lucide-react';

interface Chain {
  blocked_pid: number;
  blocked_user: string;
  blocked_app: string;
  blocked_state: string;
  blocked_wait_event: string;
  blocked_wait_seconds: number | null;
  blocked_query: string;
  blocking_pid: number;
  blocking_user: string;
  blocking_app: string;
  blocking_state: string;
  blocking_query: string;
  lock_type: string;
  lock_mode: string;
  relation: string;
  severity: 'info' | 'warning' | 'critical';
}

const sevVariant = (s: Chain['severity']) =>
  s === 'critical' ? 'destructive' : s === 'warning' ? 'secondary' : 'default';

export function BlockingChainsCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['blocking-chains'],
    queryFn: async (): Promise<Chain[]> => {
      const { data, error } = await supabase.rpc('get_blocking_chains');
      if (error) throw error;
      return (data ?? []) as unknown as Chain[];
    },
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const critical = data?.filter((c) => c.severity === 'critical').length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <GitBranch className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Cadeias de bloqueio ativas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar: {(error as Error)?.message ?? 'erro desconhecido'}
          </p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma sessão bloqueada no momento. ✅
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{data.length} bloqueio{data.length === 1 ? '' : 's'} ativo{data.length === 1 ? '' : 's'}</span>
              {critical > 0 && <Badge variant="destructive">{critical} crítico{critical === 1 ? '' : 's'}</Badge>}
            </div>
            <div className="space-y-3">
              {data.map((c, i) => (
                <div key={`${c.blocked_pid}-${c.blocking_pid}-${i}`} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <Badge variant={sevVariant(c.severity)}>
                      esperando {c.blocked_wait_seconds ?? '?'}s
                    </Badge>
                    <Badge variant="outline">{c.lock_mode}</Badge>
                    <span className="text-xs text-muted-foreground font-mono">{c.relation}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2 text-xs">
                    <div className="rounded bg-muted/50 p-2">
                      <p className="font-semibold text-foreground">🚫 Vítima · pid {c.blocked_pid}</p>
                      <p className="text-muted-foreground">
                        {c.blocked_user} @ {c.blocked_app} · {c.blocked_state} · {c.blocked_wait_event}
                      </p>
                      <p className="font-mono mt-1 text-foreground truncate" title={c.blocked_query}>
                        {c.blocked_query || '—'}
                      </p>
                    </div>
                    <div className="rounded bg-muted/50 p-2">
                      <p className="font-semibold text-foreground">🔒 Bloqueador · pid {c.blocking_pid}</p>
                      <p className="text-muted-foreground">
                        {c.blocking_user} @ {c.blocking_app} · {c.blocking_state}
                      </p>
                      <p className="font-mono mt-1 text-foreground truncate" title={c.blocking_query}>
                        {c.blocking_query || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
