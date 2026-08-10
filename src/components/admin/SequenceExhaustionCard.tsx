import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Hash } from 'lucide-react';

interface SequenceRow {
  schema_name: string;
  sequence_name: string;
  data_type: string;
  last_value: number | null;
  max_value: number;
  increment_by: number;
  is_cycled: boolean;
  owned_by_table: string | null;
  owned_by_column: string | null;
  pct_used: number | null;
  severity: 'ok' | 'medium' | 'high' | 'critical';
}

const severityVariant = (s: SequenceRow['severity']) =>
  s === 'critical'
    ? 'destructive'
    : s === 'high'
      ? 'destructive'
      : s === 'medium'
        ? 'secondary'
        : 'default';

const severityLabel: Record<SequenceRow['severity'], string> = {
  ok: 'ok',
  medium: 'atenção',
  high: 'alto',
  critical: 'crítico',
};

function recommendation(row: SequenceRow): string {
  if (row.is_cycled) return 'Cíclica — reinicia automaticamente.';
  if (row.severity === 'critical')
    return 'Migrar coluna para BIGINT imediatamente — INSERTs vão falhar em breve.';
  if (row.severity === 'high') return 'Planejar migração para BIGINT ou reset controlado.';
  if (row.severity === 'medium') return 'Acompanhar taxa de consumo.';
  return 'Sem ação necessária.';
}

export function SequenceExhaustionCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sequence-exhaustion'],
    queryFn: async (): Promise<SequenceRow[]> => {
      const { data, error } = await supabase.rpc('get_sequence_exhaustion');
      if (error) throw error;
      return (data ?? []) as unknown as SequenceRow[];
    },
    refetchInterval: 300_000,
    staleTime: 120_000,
  });

  const critical = data?.filter((s) => s.severity === 'critical').length ?? 0;
  const high = data?.filter((s) => s.severity === 'high').length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Hash className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Exaustão de sequences — prevenção de overflow</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar: {(error as Error)?.message ?? 'erro desconhecido'}
          </p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma sequence encontrada.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>
                {data.length} sequence{data.length === 1 ? '' : 's'}
              </span>
              {high > 0 && <Badge variant="destructive">{high} alto</Badge>}
              {critical > 0 && (
                <Badge variant="destructive">
                  {critical} crítico{critical === 1 ? '' : 's'}
                </Badge>
              )}
              {critical === 0 && high === 0 && <Badge variant="default">saudável</Badge>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-3">Sequence</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Dono</th>
                    <th className="py-2 pr-3">Uso</th>
                    <th className="py-2 pr-3">Severidade</th>
                    <th className="py-2">Recomendação</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 30).map((s) => (
                    <tr
                      key={`${s.schema_name}.${s.sequence_name}`}
                      className="border-b border-border/50 align-top"
                    >
                      <td className="py-2 pr-3 font-mono text-xs text-foreground">
                        {s.schema_name}.{s.sequence_name}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{s.data_type}</td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {s.owned_by_table ? (
                          `${s.owned_by_table}.${s.owned_by_column}`
                        ) : (
                          <span className="italic">órfã</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs">
                        {s.pct_used !== null ? `${Number(s.pct_used).toFixed(2)}%` : '—'}
                        {s.is_cycled && <span className="ml-1 text-muted-foreground">(cycle)</span>}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={severityVariant(s.severity)}>
                          {severityLabel[s.severity]}
                        </Badge>
                      </td>
                      <td className="py-2 text-xs text-muted-foreground">{recommendation(s)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 30 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Exibindo 30 de {data.length} sequences (ordenadas por uso).
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
