import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bell, CheckCircle2, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface StuckAlert {
  id: string;
  asset_id: string;
  hours_stuck: number;
  channel: string;
  delivered: boolean;
  error_message: string | null;
  created_at: string;
}

export function GlacierStuckAlertsCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['glacier-stuck-alerts'],
    queryFn: async (): Promise<StuckAlert[]> => {
      const { data, error } = await supabase
        .from('glacier_stuck_alerts')
        .select('id, asset_id, hours_stuck, channel, delivered, error_message, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as StuckAlert[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const delivered = (data ?? []).filter((r) => r.delivered).length;
  const failed = (data ?? []).filter((r) => !r.delivered).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          Alertas Glacier Presa (últimos 50)
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="default" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {delivered} enviados
            </Badge>
            {failed > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {failed} falharam
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">Não foi possível carregar o histórico de alertas.</p>
        )}
        {!isLoading && !isError && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta disparado. Cron `glacier-stuck-monitor` roda a cada 15 min.
          </p>
        )}
        {!isLoading && !isError && (data ?? []).length > 0 && (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {(data ?? []).map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 ${
                  alert.delivered ? 'border-border bg-card' : 'border-destructive/50 bg-destructive/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-foreground">
                      asset {alert.asset_id.slice(0, 8)}…
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {alert.hours_stuck}h presa · via {alert.channel} ·{' '}
                      {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                    {alert.error_message && (
                      <p className="mt-1 text-[11px] text-destructive">⚠ {alert.error_message}</p>
                    )}
                  </div>
                  {alert.delivered ? (
                    <Badge variant="default" className="flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3" /> OK
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex items-center gap-1 shrink-0">
                      <AlertTriangle className="h-3 w-3" /> Falhou
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Atualiza a cada 60s. Cron a cada 15 min com dedup nativo de 6h por asset.
        </p>
      </CardContent>
    </Card>
  );
}
