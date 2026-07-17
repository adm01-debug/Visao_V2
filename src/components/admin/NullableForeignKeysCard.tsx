import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Link2Off } from 'lucide-react';

interface Row {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  column_name: string;
  referenced_table: string;
  referenced_column: string;
  on_delete_action: string;
  table_size_bytes: number;
  table_size_pretty: string;
  estimated_rows: number;
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

export function NullableForeignKeysCard() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['nullable-foreign-keys'],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc('get_nullable_foreign_keys');
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    refetchInterval: 600_000,
    staleTime: 300_000,
  });

  const critical = data?.filter((r) => r.severity === 'critical').length ?? 0;
  const warning = data?.filter((r) => r.severity === 'warning').length ?? 0;
  const info = data?.filter((r) => r.severity === 'info').length ?? 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Link2Off className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Foreign Keys com colunas nullable</CardTitle>
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
            Todas as chaves estrangeiras usam NOT NULL. ✅
          </p>
        )}
        {!isLoading && !isError && (data?.length ?? 0) > 0 && (
          <>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="destructive">{critical} críticas</Badge>
              <Badge variant="secondary">{warning} atenção</Badge>
              <Badge variant="default">{info} intencionais</Badge>
            </div>
            <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {data!.map((r) => (
                <div
                  key={`${r.schema_name}.${r.table_name}.${r.constraint_name}.${r.column_name}`}
                  className="rounded-md border border-border bg-muted/30 p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs">
                      {r.table_name}.{r.column_name} → {r.referenced_table}.{r.referenced_column}
                    </span>
                    <Badge variant={variant(r.severity)}>{label[r.severity]}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span>tamanho: {r.table_size_pretty}</span>
                    <span>~{r.estimated_rows.toLocaleString('pt-BR')} linhas</span>
                    <span>ON DELETE: {r.on_delete_action}</span>
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
