import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WraparoundRow {
  scope: string;
  object_name: string;
  xid_age: number;
  age_ratio_pct: number;
  severity: 'ok' | 'warn' | 'critical';
  recommendation: string;
}

export function TxidWraparoundCard({ limit = 15 }: { limit?: number }) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['txid-wraparound', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_txid_wraparound_status', { _limit: limit });
      if (error) throw error;
      return (data ?? []) as WraparoundRow[];
    },
    refetchInterval: 10 * 60_000,
    retry: false,
  });

  const errMsg = (error as Error | undefined)?.message ?? '';
  const isPermission = /access denied|permission|401|403/i.test(errMsg);
  const rows = data ?? [];
  const dbRow = rows.find((r) => r.scope === 'database');
  const tables = rows.filter((r) => r.scope === 'table');
  const critical = tables.filter((r) => r.severity === 'critical').length;
  const warns = tables.filter((r) => r.severity === 'warn').length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Idade de transações (prevenção de wraparound)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
        ) : (
          <>
            {dbRow && (
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium">Banco: {dbRow.object_name}</span>
                  <Badge
                    variant={
                      dbRow.severity === 'critical'
                        ? 'destructive'
                        : dbRow.severity === 'warn'
                          ? 'secondary'
                          : 'default'
                    }
                  >
                    {dbRow.severity}
                  </Badge>
                </div>
                <Progress value={Math.min(100, Number(dbRow.age_ratio_pct))} className="h-2" />
                <p className="mt-2 text-xs text-muted-foreground">
                  Idade: {Number(dbRow.xid_age).toLocaleString('pt-BR')} XIDs (
                  {Number(dbRow.age_ratio_pct).toFixed(1)}% do freeze_max_age)
                </p>
                {dbRow.recommendation !== 'ok' && (
                  <p className="mt-1 text-xs font-medium text-destructive">
                    {dbRow.recommendation}
                  </p>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">Tabelas OK</p>
                <p className="font-medium tabular-nums">{tables.length - critical - warns}</p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">Atenção</p>
                <p className="font-medium tabular-nums text-warning">{warns}</p>
              </div>
              <div className="rounded-md border border-border p-2">
                <p className="text-xs text-muted-foreground">Crítico</p>
                <p className="font-medium tabular-nums text-destructive">{critical}</p>
              </div>
            </div>

            {tables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem tabelas com idade relevante — autovacuum saudável.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-4">Tabela</th>
                      <th className="py-2 pr-4 text-right">Idade (XIDs)</th>
                      <th className="py-2 pr-4 text-right">% freeze</th>
                      <th className="py-2 pr-2">Severidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tables.map((r, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-2 pr-4 font-mono text-xs">{r.object_name}</td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {Number(r.xid_age).toLocaleString('pt-BR')}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {Number(r.age_ratio_pct).toFixed(1)}%
                        </td>
                        <td className="py-2 pr-2">
                          <Badge
                            variant={
                              r.severity === 'critical'
                                ? 'destructive'
                                : r.severity === 'warn'
                                  ? 'secondary'
                                  : 'default'
                            }
                          >
                            {r.severity}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Alertas baseados em <code>autovacuum_freeze_max_age</code>. Wraparound crítico deixa o
          banco em modo somente-leitura. Auto-refresh 10 min.
        </p>
      </CardContent>
    </Card>
  );
}
