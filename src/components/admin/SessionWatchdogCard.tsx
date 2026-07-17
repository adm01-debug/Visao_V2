import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Lock } from 'lucide-react';

interface SessionRow {
  pid: number;
  usename: string | null;
  application_name: string | null;
  client_addr: string | null;
  state: string | null;
  wait_event_type: string | null;
  wait_event: string | null;
  query_start: string | null;
  runtime_secs: number;
  query: string | null;
}

interface LockRow {
  blocked_pid: number;
  blocked_user: string | null;
  blocked_statement: string | null;
  blocking_pid: number;
  blocking_user: string | null;
  blocking_statement: string | null;
  blocked_wait_secs: number;
}

function stateBadge(state: string | null, runtime: number): 'default' | 'secondary' | 'destructive' {
  if (state === 'idle in transaction' && runtime >= 300) return 'destructive';
  if (state === 'active' && runtime >= 120) return 'destructive';
  if (runtime >= 60) return 'secondary';
  return 'default';
}

/**
 * Onda 71 — Watchdog de sessões longas e bloqueios.
 * Combina `get_long_running_sessions` + `get_blocking_locks` (admin RPCs).
 */
export function SessionWatchdogCard() {
  const sessions = useQuery({
    queryKey: ['long-running-sessions'],
    queryFn: async (): Promise<SessionRow[]> => {
      const { data, error } = await supabase.rpc('get_long_running_sessions', {
        _active_min_secs: 30,
        _idle_tx_min_secs: 60,
      });
      if (error) throw error;
      return (data ?? []) as unknown as SessionRow[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const locks = useQuery({
    queryKey: ['blocking-locks'],
    queryFn: async (): Promise<LockRow[]> => {
      const { data, error } = await supabase.rpc('get_blocking_locks');
      if (error) throw error;
      return (data ?? []) as unknown as LockRow[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <AlertTriangle className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">
            Sessões longas (ativas &gt; 30s / idle-tx &gt; 60s)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : sessions.isError ? (
            <p className="text-sm text-destructive">
              {(sessions.error as Error)?.message ?? 'erro desconhecido'}
            </p>
          ) : !sessions.data?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma sessão problemática detectada. ✅
            </p>
          ) : (
            <ul className="space-y-2">
              {sessions.data.map((s) => (
                <li
                  key={s.pid}
                  className="border-b border-border/50 pb-2 last:border-0 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-foreground">
                      pid {s.pid} · {s.usename ?? '—'} · {s.application_name ?? '—'}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{s.state ?? '—'}</Badge>
                      <Badge variant={stateBadge(s.state, s.runtime_secs)}>
                        {s.runtime_secs.toFixed(0)}s
                      </Badge>
                    </div>
                  </div>
                  {s.wait_event && (
                    <p className="text-xs text-muted-foreground mt-1">
                      wait: {s.wait_event_type}/{s.wait_event}
                    </p>
                  )}
                  <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                    {s.query ?? '—'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-2">
          <Lock className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Bloqueios ativos (lock contention)</CardTitle>
        </CardHeader>
        <CardContent>
          {locks.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : locks.isError ? (
            <p className="text-sm text-destructive">
              {(locks.error as Error)?.message ?? 'erro desconhecido'}
            </p>
          ) : !locks.data?.length ? (
            <p className="text-sm text-muted-foreground">
              Nenhum bloqueio ativo. ✅
            </p>
          ) : (
            <ul className="space-y-3">
              {locks.data.map((l) => (
                <li
                  key={`${l.blocked_pid}-${l.blocking_pid}`}
                  className="border-b border-border/50 pb-2 last:border-0 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">
                      pid <strong>{l.blocked_pid}</strong> ⏸ aguarda pid{' '}
                      <strong>{l.blocking_pid}</strong>
                    </span>
                    <Badge variant="destructive">{l.blocked_wait_secs.toFixed(0)}s</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">Bloqueada:</span>{' '}
                    <span className="font-mono">{l.blocked_statement ?? '—'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    <span className="font-semibold">Bloqueadora:</span>{' '}
                    <span className="font-mono">{l.blocking_statement ?? '—'}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
