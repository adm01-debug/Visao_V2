import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Trash2 } from 'lucide-react';

interface BloatRow {
  schema_name: string;
  table_name: string;
  live_rows: number;
  dead_rows: number;
  dead_ratio_pct: number;
  last_vacuum: string | null;
  last_autovacuum: string | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  n_mod_since_analyze: number;
}

function severity(pct: number): 'default' | 'secondary' | 'destructive' {
  if (pct >= 40) return 'destructive';
  if (pct >= 20) return 'secondary';
  return 'default';
}

function fmt(ts: string | null): string {
  if (!ts) return 'nunca';
  return new Date(ts).toLocaleString('pt-BR');
}

/**
 * Onda 70 — Monitor de dead tuples / bloat por tabela.
 * Admin-only via RPC `get_table_bloat_stats`.
 */
export function TableBloatCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['table-bloat-stats'],
    queryFn: async (): Promise<BloatRow[]> => {
      const { data, error } = await supabase.rpc('get_table_bloat_stats', {
        _min_dead_rows: 1000,
      });
      if (error) throw error;
      return (data ?? []) as unknown as BloatRow[];
    },
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Trash2 className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">
          Dead tuples por tabela (VACUUM seletivo dom. 03:15 UTC)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar: {(error as Error)?.message ?? 'erro desconhecido'}
          </p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma tabela com bloat significativo (&lt; 1000 linhas mortas em cada).
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4">Tabela</th>
                  <th className="py-2 pr-4 text-right">Live</th>
                  <th className="py-2 pr-4 text-right">Dead</th>
                  <th className="py-2 pr-4 text-right">Bloat %</th>
                  <th className="py-2 pr-4">Último VACUUM</th>
                  <th className="py-2">Último ANALYZE</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => {
                  const lastVac = r.last_vacuum || r.last_autovacuum;
                  const lastAna = r.last_analyze || r.last_autoanalyze;
                  return (
                    <tr
                      key={`${r.schema_name}.${r.table_name}`}
                      className="border-b border-border/50"
                    >
                      <td className="py-2 pr-4 font-mono text-xs text-foreground">
                        {r.table_name}
                      </td>
                      <td className="py-2 pr-4 text-right text-xs">
                        {r.live_rows.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4 text-right text-xs">
                        {r.dead_rows.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        <Badge variant={severity(r.dead_ratio_pct)}>
                          {r.dead_ratio_pct.toFixed(1)}%
                        </Badge>
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {fmt(lastVac)}
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{fmt(lastAna)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
