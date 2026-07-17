import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Wrench } from 'lucide-react';

interface Row {
  schema_name: string;
  table_name: string;
  reloptions: string[] | null;
  autovacuum_enabled_override: boolean | null;
  scale_factor_override: number | null;
  threshold_override: number | null;
  n_live_tuples: number;
  n_dead_tuples: number;
  dead_pct: number;
  last_autovacuum: string | null;
  last_vacuum: string | null;
  total_size_bytes: number;
  total_size_pretty: string;
  severity: 'ok' | 'info' | 'warning' | 'critical';
  recommendation: string;
}

const variant = (s: Row['severity']) =>
  s === 'critical' ? 'destructive' : s === 'warning' ? 'secondary' : 'default';

const label: Record<Row['severity'], string> = {
  ok: 'ok',
  info: 'info',
  warning: 'atenção',
  critical: 'crítico',
};

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR') : 'nunca';

export function AutovacuumOverridesCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['autovacuum-overrides'],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc('get_autovacuum_overrides');
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 600_000,
    staleTime: 300_000,
  });

  const critical = data?.filter((r) => r.severity === 'critical').length ?? 0;
  const warning = data?.filter((r) => r.severity === 'warning').length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Wrench className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Overrides de Autovacuum</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading && <Skeleton className="h-32 w-full" />}
        {isError && (
          <p className="text-sm text-destructive">
            Erro ao carregar: {(error as Error)?.message ?? 'desconhecido'}
          </p>
        )}
        {!isLoading && !isError && (data?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma tabela com overrides de autovacuum — todas usam configuração padrão. ✅
          </p>
        )}
        {!isLoading && !isError && (data?.length ?? 0) > 0 && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="destructive">{critical} críticas</Badge>
              <Badge variant="secondary">{warning} atenção</Badge>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {data!.map((r) => (
                <div
                  key={`${r.schema_name}.${r.table_name}`}
                  className="rounded-md border border-border bg-muted/30 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">
                      {r.schema_name}.{r.table_name}
                    </span>
                    <Badge variant={variant(r.severity)}>{label[r.severity]}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>tamanho: {r.total_size_pretty}</span>
                    <span>dead: {r.n_dead_tuples.toLocaleString('pt-BR')} ({r.dead_pct}%)</span>
                    <span>autovac: {formatDate(r.last_autovacuum)}</span>
                    {r.autovacuum_enabled_override === false && (
                      <span className="text-destructive">DESLIGADO</span>
                    )}
                    {r.scale_factor_override !== null && (
                      <span>scale={r.scale_factor_override}</span>
                    )}
                    {r.threshold_override !== null && (
                      <span>threshold={r.threshold_override}</span>
                    )}
                  </div>
                  <p className="mt-2 text-xs">{r.recommendation}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
