import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Snowflake, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface RestoreRow {
  asset_id: string;
  user_id: string;
  camera_id: string | null;
  object_key: string;
  size_bytes: number;
  restore_status: 'in_progress' | 'available' | 'expired' | string;
  restore_requested_at: string | null;
  restore_available_until: string | null;
  hours_since_request: number | null;
  is_stuck: boolean;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

const STATUS_META: Record<
  string,
  {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    icon: typeof Clock;
  }
> = {
  in_progress: { label: 'Em progresso', variant: 'secondary', icon: Clock },
  available: { label: 'Disponível', variant: 'default', icon: CheckCircle2 },
  expired: { label: 'Expirada', variant: 'outline', icon: AlertTriangle },
};

export function GlacierRestoreMonitorCard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['glacier-restore-status'],
    queryFn: async (): Promise<RestoreRow[]> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)('get_glacier_restore_status', {
        _limit: 100,
      });
      if (error) throw error;
      return (data ?? []) as RestoreRow[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const stuck = (data ?? []).filter((r) => r.is_stuck).length;
  const inProgress = (data ?? []).filter((r) => r.restore_status === 'in_progress').length;
  const available = (data ?? []).filter((r) => r.restore_status === 'available').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Snowflake className="h-5 w-5 text-primary" />
          Restaurações Glacier
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="secondary">{inProgress} em progresso</Badge>
            <Badge variant="default">{available} disponíveis</Badge>
            {stuck > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {stuck} presas
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">
            Não foi possível carregar as restaurações Glacier.
          </p>
        )}
        {!isLoading && !isError && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma restauração ativa no momento.</p>
        )}
        {!isLoading && !isError && (data ?? []).length > 0 && (
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {(data ?? []).map((row) => {
              const meta = STATUS_META[row.restore_status] ?? {
                label: row.restore_status,
                variant: 'outline' as const,
                icon: Clock,
              };
              const Icon = meta.icon;
              return (
                <div
                  key={row.asset_id}
                  className={`rounded-lg border p-3 ${row.is_stuck ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono text-xs text-foreground">{row.object_key}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatBytes(row.size_bytes)} · {row.hours_since_request ?? '—'} h desde
                        solicitação
                      </p>
                    </div>
                    <Badge variant={meta.variant} className="flex items-center gap-1 shrink-0">
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </div>
                  {row.is_stuck && (
                    <p className="mt-2 text-[11px] text-destructive">
                      ⚠ Restauração há mais de 12 h em progresso — verifique o job de arquivamento.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground">
          Atualiza a cada 60s. Restaurações Glacier levam 3–12 h (Standard) ou 12+ h (Bulk).
        </p>
      </CardContent>
    </Card>
  );
}
