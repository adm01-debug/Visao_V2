import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface BloatRow {
  schema_name: string;
  table_name: string;
  live_tuples: number;
  dead_tuples: number;
  dead_ratio: number;
  total_bytes: number;
  estimated_bloat_bytes: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  recommendation: string;
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 ? 0 : 1)} ${units[i]}`;
}

function formatDate(d: string | null): string {
  if (!d) return 'nunca';
  return new Date(d).toLocaleString('pt-BR');
}

function severity(ratio: number): 'ok' | 'warn' | 'critical' {
  if (ratio > 40) return 'critical';
  if (ratio > 20) return 'warn';
  return 'ok';
}

export function TableBloatCard({
  minSizeMb = 10,
  limit = 30,
}: {
  minSizeMb?: number;
  limit?: number;
}) {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['table-bloat', minSizeMb, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_table_bloat_estimate', {
        _min_size_mb: minSizeMb,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as BloatRow[];
    },
    refetchInterval: 5 * 60_000,
    retry: false,
  });

  const errMsg = (error as Error | undefined)?.message ?? '';
  const isPermission = /access denied|permission|401|403/i.test(errMsg);
  const rows = data ?? [];
  const totalBloat = rows.reduce((sum, r) => sum + Number(r.estimated_bloat_bytes || 0), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Trash2 className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Bloat estimado de tabelas (≥ {minSizeMb} MB)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
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
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tabela relevante encontrada. Bloat sob controle.
          </p>
        ) : (
          <>
            <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
              <span className="text-muted-foreground">
                Espaço morto estimado (top {rows.length}):{' '}
              </span>
              <span className="font-medium tabular-nums">{formatBytes(totalBloat)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4">Tabela</th>
                    <th className="py-2 pr-4 text-right">Dead %</th>
                    <th className="py-2 pr-4 text-right">Bloat</th>
                    <th className="py-2 pr-4 text-right">Tamanho</th>
                    <th className="py-2 pr-4">Último vacuum</th>
                    <th className="py-2 pr-2">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const sev = severity(Number(r.dead_ratio));
                    const variant =
                      sev === 'critical' ? 'destructive' : sev === 'warn' ? 'secondary' : 'default';
                    const vacuum = r.last_autovacuum || r.last_vacuum;
                    return (
                      <tr key={i} className="border-b border-border/50 align-top">
                        <td className="py-2 pr-4 font-mono text-xs">
                          {r.schema_name}.{r.table_name}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {Number(r.dead_ratio).toFixed(1)}%
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatBytes(r.estimated_bloat_bytes)}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums">
                          {formatBytes(r.total_bytes)}
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted-foreground">
                          {formatDate(vacuum)}
                        </td>
                        <td className="py-2 pr-2">
                          <Badge variant={variant}>{r.recommendation}</Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Estimativa via <code>pg_stat_user_tables</code>. Auto-refresh 5 min.{' '}
          <code>VACUUM FULL</code> requer lock exclusivo — planeje janela de manutenção.
        </p>
      </CardContent>
    </Card>
  );
}
