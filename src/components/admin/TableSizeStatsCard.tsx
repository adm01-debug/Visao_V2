import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, RefreshCw, AlertTriangle } from "lucide-react";

interface TableSize {
  schema_name: string;
  table_name: string;
  total_bytes: number;
  heap_bytes: number;
  index_bytes: number;
  toast_bytes: number;
  total_pretty: string;
  heap_pretty: string;
  index_pretty: string;
  toast_pretty: string;
  index_ratio_pct: number;
  row_estimate: number;
}

function fmtRows(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

export function TableSizeStatsCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-table-size-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_table_size_stats", { _min_size_mb: 1 });
      if (error) throw error;
      return (data ?? []) as TableSize[];
    },
    staleTime: 120_000,
    retry: 1,
  });

  const totalBytes = (data ?? []).reduce((a, t) => a + Number(t.total_bytes ?? 0), 0);
  const totalGB = (totalBytes / (1024 ** 3)).toFixed(2);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" /> Tamanho das tabelas (capacity planning)
          </CardTitle>
          <CardDescription>
            Heap + índices + TOAST das top 50 tabelas do schema public. Ratio índice/heap acima de
            100% sinaliza over-indexing.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar tamanhos"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {(error as Error).message}
          </div>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tabela ≥ 1 MB encontrada.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{data.length} tabelas</Badge>
              <Badge variant="secondary">{totalGB} GB total</Badge>
            </div>
            <ScrollArea className="h-72 rounded-md border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted/70 backdrop-blur">
                  <tr className="text-left">
                    <th className="p-2">Tabela</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Heap</th>
                    <th className="p-2">Índices</th>
                    <th className="p-2">TOAST</th>
                    <th className="p-2">Idx/Heap</th>
                    <th className="p-2">Linhas ~</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.map((t) => {
                    const overIndexed = t.index_ratio_pct > 100;
                    return (
                      <tr key={`${t.schema_name}.${t.table_name}`}>
                        <td className="p-2 font-mono">{t.table_name}</td>
                        <td className="p-2 font-medium">{t.total_pretty}</td>
                        <td className="p-2">{t.heap_pretty}</td>
                        <td className="p-2">{t.index_pretty}</td>
                        <td className="p-2 text-muted-foreground">{t.toast_pretty}</td>
                        <td className="p-2">
                          <Badge
                            variant={overIndexed ? "destructive" : "outline"}
                            className="font-mono"
                          >
                            {t.index_ratio_pct}%
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{fmtRows(t.row_estimate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
