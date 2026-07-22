import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Activity, AlertTriangle, CheckCircle2, HelpCircle, RefreshCw, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type HealthState = 'online' | 'degraded' | 'offline' | 'unknown';

interface Row {
  camera_id: string;
  state: HealthState;
  consecutive_failures: number;
  consecutive_successes: number;
  last_check_at: string | null;
  last_state_change_at: string;
  last_alert_at: string | null;
  last_latency_ms: number | null;
  last_http_code: number | null;
  last_message: string | null;
  cameras: { name: string; location: string | null } | null;
}

const badgeVariant = (state: HealthState) => {
  switch (state) {
    case 'online':
      return { className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30', label: 'Online', Icon: CheckCircle2 };
    case 'degraded':
      return { className: 'bg-amber-500/15 text-amber-500 border-amber-500/30', label: 'Instável', Icon: AlertTriangle };
    case 'offline':
      return { className: 'bg-destructive/15 text-destructive border-destructive/30', label: 'Offline', Icon: AlertTriangle };
    default:
      return { className: 'bg-muted text-muted-foreground border-border', label: 'Sem dados', Icon: HelpCircle };
  }
};

export function CameraHealthCard() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['camera-health-state'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('camera_health_state')
        .select('camera_id, state, consecutive_failures, consecutive_successes, last_check_at, last_state_change_at, last_alert_at, last_latency_ms, last_http_code, last_message, cameras:cameras(name, location)')
        .order('state', { ascending: true })
        .order('last_check_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const summary = useMemo(() => {
    const s = { online: 0, degraded: 0, offline: 0, unknown: 0 };
    (data ?? []).forEach((r) => { s[r.state] += 1; });
    return s;
  }, [data]);

  const runProbeNow = async () => {
    try {
      await Promise.all([
        supabase.functions.invoke('stream-health-probe', { body: { ts: new Date().toISOString() } }),
      ]);
      await new Promise((r) => setTimeout(r, 1500));
      await supabase.functions.invoke('camera-health-monitor', { body: { ts: new Date().toISOString() } });
      toast.success('Sondagem e monitoramento executados.');
      refetch();
    } catch (e) {
      toast.error(`Falha ao executar: ${(e as Error).message}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Saúde das câmeras</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
            {summary.online} online
          </Badge>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            {summary.degraded} instável
          </Badge>
          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
            {summary.offline} offline
          </Badge>
          <Button size="sm" variant="outline" onClick={runProbeNow} disabled={isRefetching}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefetching ? 'animate-spin' : ''}`} />
            Sondar agora
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma sondagem ainda. Cadastre uma câmera com HLS/substream e o monitoramento inicia automaticamente.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {data.map((row) => {
              const v = badgeVariant(row.state);
              const Icon = v.Icon;
              return (
                <div key={row.camera_id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Video className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{row.cameras?.name ?? row.camera_id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {row.cameras?.location ?? '—'}
                        {row.last_check_at && (
                          <> · última verificação {formatDistanceToNow(new Date(row.last_check_at), { addSuffix: true, locale: ptBR })}</>
                        )}
                        {row.last_latency_ms != null && row.state !== 'offline' && (
                          <> · {row.last_latency_ms} ms</>
                        )}
                        {row.state === 'offline' && row.last_message && (
                          <> · {row.last_message}</>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {row.state === 'offline' && (
                      <span className="text-xs text-muted-foreground">
                        {row.consecutive_failures} falhas
                      </span>
                    )}
                    <Badge variant="outline" className={v.className}>
                      <Icon className="h-3 w-3 mr-1" />
                      {v.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
