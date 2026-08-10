import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShieldCheck } from 'lucide-react';

interface Row {
  schema_name: string;
  table_name: string;
  rls_enabled: boolean;
  rls_forced: boolean;
  is_partition: boolean;
  total_policies: number;
  select_policies: number;
  insert_policies: number;
  update_policies: number;
  delete_policies: number;
  all_policies: number;
  severity: 'ok' | 'info' | 'warning' | 'critical';
  finding: string;
}

const sevVariant = (s: Row['severity']) =>
  s === 'critical'
    ? 'destructive'
    : s === 'warning'
      ? 'secondary'
      : s === 'info'
        ? 'outline'
        : 'default';

export function RlsCoverageCard() {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rls-coverage'],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.rpc('audit_rls_coverage');
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
    staleTime: 300_000,
  });

  const summary = useMemo(() => {
    if (!data) return { critical: 0, warning: 0, info: 0, ok: 0 };
    return data.reduce(
      (acc, r) => {
        acc[r.severity] = (acc[r.severity] ?? 0) + 1;
        return acc;
      },
      { critical: 0, warning: 0, info: 0, ok: 0 } as Record<Row['severity'], number>
    );
  }, [data]);

  const visible = useMemo(
    () => (showAll ? (data ?? []) : (data ?? []).filter((r) => r.severity !== 'ok')),
    [data, showAll]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <CardTitle className="text-base">Cobertura de RLS — tabelas públicas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <p className="text-sm text-destructive">
            Falha ao carregar: {(error as Error)?.message ?? 'erro desconhecido'}
          </p>
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma tabela encontrada.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="destructive">{summary.critical} sem RLS</Badge>
              <Badge variant="secondary">{summary.warning} sem policies</Badge>
              <Badge variant="outline">{summary.info} cobertura parcial</Badge>
              <Badge variant="default">{summary.ok} OK</Badge>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? 'Mostrar só alertas' : 'Mostrar todas'}
              </Button>
            </div>
            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Sem alertas — todas as tabelas estão OK. ✅
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="py-2 pr-3">Tabela</th>
                      <th className="py-2 pr-3">RLS</th>
                      <th className="py-2 pr-3">Policies (S/I/U/D/*)</th>
                      <th className="py-2 pr-3">Severidade</th>
                      <th className="py-2">Diagnóstico</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((r) => (
                      <tr
                        key={`${r.schema_name}.${r.table_name}`}
                        className="border-b border-border/50 align-top"
                      >
                        <td className="py-2 pr-3 font-mono text-xs text-foreground">
                          {r.table_name}
                          {r.is_partition && (
                            <Badge variant="outline" className="ml-2">
                              partição
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-xs">
                          <Badge variant={r.rls_enabled ? 'default' : 'destructive'}>
                            {r.rls_enabled ? (r.rls_forced ? 'forçado' : 'ativo') : 'off'}
                          </Badge>
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                          {r.select_policies}/{r.insert_policies}/{r.update_policies}/
                          {r.delete_policies}/{r.all_policies}
                        </td>
                        <td className="py-2 pr-3">
                          <Badge variant={sevVariant(r.severity)}>{r.severity}</Badge>
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">{r.finding}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
