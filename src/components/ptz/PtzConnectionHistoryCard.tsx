import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircle2, XCircle, AlertCircle, History, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PtzConnectionHistoryCardProps {
  cameraId?: string;
  profileId?: string | null;
  limit?: number;
  className?: string;
}

interface AttemptRow {
  id: string;
  camera_id: string;
  profile_id: string | null;
  backend: string;
  ok: boolean;
  reachable: boolean;
  http_status: number;
  latency_ms: number;
  error_detail: string | null;
  used_relay: boolean;
  source: string;
  created_at: string;
}

/**
 * Histórico de tentativas de conexão PTZ — permite depurar falhas recorrentes
 * por câmera ou por perfil OEM (ex.: xiongmai-nbd80x). Ordenado por data desc.
 */
export function PtzConnectionHistoryCard({
  cameraId,
  profileId,
  limit = 50,
  className,
}: PtzConnectionHistoryCardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['ptz-connection-history', { cameraId, profileId, limit }],
    queryFn: async (): Promise<AttemptRow[]> => {
      let q = supabase
        .from('ptz_connection_attempts')
        .select('id,camera_id,profile_id,backend,ok,reachable,http_status,latency_ms,error_detail,used_relay,source,created_at')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (cameraId) q = q.eq('camera_id', cameraId);
      if (profileId) q = q.eq('profile_id', profileId);
      const { data: rows, error } = await q;
      if (error) throw error;
      return (rows ?? []) as AttemptRow[];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const stats = useMemo(() => {
    const rows = data ?? [];
    if (!rows.length) return null;
    const total = rows.length;
    const ok = rows.filter((r) => r.ok).length;
    const avgLat = Math.round(rows.reduce((s, r) => s + r.latency_ms, 0) / total);
    const byBackend = new Map<string, { ok: number; total: number; lat: number }>();
    for (const r of rows) {
      const b = byBackend.get(r.backend) ?? { ok: 0, total: 0, lat: 0 };
      b.total += 1;
      b.lat += r.latency_ms;
      if (r.ok) b.ok += 1;
      byBackend.set(r.backend, b);
    }
    return { total, ok, avgLat, byBackend };
  }, [data]);

  return (
    <Card className={cn('border-border/60', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Histórico de conexões PTZ</CardTitle>
        </div>
        <CardDescription>
          {profileId ? `Perfil OEM: ${profileId}` : cameraId ? 'Últimas tentativas desta câmera' : 'Últimas tentativas'}
          {' · '}atualizado a cada 30s
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            Ainda não há tentativas registradas.
          </div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-3 gap-2 rounded-md border border-border/60 bg-muted/30 p-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Taxa de sucesso</p>
                  <p className="font-semibold text-foreground">
                    {stats.ok}/{stats.total} ({Math.round((stats.ok / stats.total) * 100)}%)
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Latência média</p>
                  <p className="font-semibold text-foreground">{stats.avgLat} ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Backends</p>
                  <p className="font-semibold text-foreground">{stats.byBackend.size}</p>
                </div>
              </div>
            )}
            <ScrollArea className="h-64 rounded-md border border-border/60">
              <ul className="divide-y divide-border/60">
                {data.map((r) => (
                  <li key={r.id} className="flex items-start gap-3 px-3 py-2 text-xs">
                    {r.ok ? (
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    ) : r.reachable ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="outline" className="font-mono uppercase">
                          {r.backend}
                        </Badge>
                        <Badge variant="secondary">HTTP {r.http_status || '—'}</Badge>
                        <Badge variant="outline">{r.latency_ms} ms</Badge>
                        {r.used_relay && (
                          <Badge variant="outline" className="gap-1">
                            <Radio className="h-3 w-3" /> relay
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-muted-foreground">
                          {r.source}
                        </Badge>
                        <span className="ml-auto text-muted-foreground">
                          {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {r.error_detail && (
                        <p className="mt-1 truncate text-muted-foreground" title={r.error_detail}>
                          {r.error_detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
