import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Radio } from 'lucide-react';

interface Slot {
  slot_name: string;
  slot_type: string;
  database: string;
  plugin: string;
  active: boolean;
  active_pid: number | null;
  restart_lsn: string;
  confirmed_flush_lsn: string;
  retained_wal_bytes: number;
  retained_wal_pretty: string;
  severity: 'ok' | 'warning' | 'critical';
  recommendation: string;
}

const severityVariant = (s: Slot['severity']) =>
  s === 'critical' ? 'destructive' : s === 'warning' ? 'secondary' : 'default';

export function ReplicationSlotsCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['replication-slots'],
    queryFn: async (): Promise<Slot[]> => {
      const { data, error } = await supabase.rpc('get_replication_slot_status');
      if (error) throw error;
      return (data ?? []) as unknown as Slot[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const critical = data?.filter((s) => s.severity === 'critical').length ?? 0;
  const inactive = data?.filter((s) => !s.active).length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Radio className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Slots de replicação — WAL retido</CardTitle>
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
            Nenhum slot de replicação ativo. Nada a monitorar.
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{data.length} slot{data.length === 1 ? '' : 's'}</span>
              {inactive > 0 && <Badge variant="secondary">{inactive} inativo{inactive === 1 ? '' : 's'}</Badge>}
              {critical > 0 && <Badge variant="destructive">{critical} crítico{critical === 1 ? '' : 's'}</Badge>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Slot</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Ativo</th>
                    <th className="py-2 pr-3">WAL retido</th>
                    <th className="py-2">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((s) => (
                    <tr key={s.slot_name} className="border-b border-border/50 align-top">
                      <td className="py-2 pr-3 font-mono text-xs text-foreground">{s.slot_name}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {s.slot_type}
                        {s.plugin !== '-' && <span className="block">{s.plugin}</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={s.active ? 'default' : 'secondary'}>
                          {s.active ? `sim (pid ${s.active_pid ?? '—'})` : 'não'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={severityVariant(s.severity)}>{s.retained_wal_pretty}</Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{s.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
