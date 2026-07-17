import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { HardDrive, RefreshCw, AlertTriangle } from "lucide-react";

interface TableCacheStat {
  schema_name: string;
  table_name: string;
  heap_hit_ratio: number | null;
  idx_hit_ratio: number | null;
  total_reads: number;
  table_size_pretty: string;
}

function ratioBadge(ratio: number | null) {
  if (ratio === null) return <Badge variant="outline">n/a</Badge>;
  if (ratio >= 99) return <Badge variant="secondary">{ratio}%</Badge>;
  if (ratio >= 95) return <Badge variant="outline">{ratio}%</Badge>;
  return <Badge variant="destructive">{ratio}%</Badge>;
}

export function TableCacheStatsCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-table-cache-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_table_cache_stats", { _min_activity: 1000 });
      if (error) throw error;
      return (data ?? []) as TableCacheStat[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const lowCache = (data ?? []).filter((t) => (t.heap_hit_ratio ?? 100) < 95).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <HardDrive className="h-4 w-4" /> Cache Hit por tabela
          </CardTitle>
          <CardDescription>
            Tabelas com maior volume de I/O e taxa de aproveitamento de cache (heap vs índice).
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar cache stats"
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
          <p className="text-sm text-muted-foreground">Sem atividade relevante.</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{data.length} tabelas</Badge>
              <Badge variant={lowCache > 0 ? "destructive" : "secondary"}>
                {lowCache} abaixo de 95%
              </Badge>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Tabela</th>
                    <th className="text-right p-2">Heap</th>
                    <th className="text-right p-2">Idx</th>
                    <th className="text-right p-2">Reads disco</th>
                    <th className="text-right p-2">Tam.</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((t) => (
                    <tr key={`${t.schema_name}.${t.table_name}`} className="border-t">
                      <td className="p-2 font-mono truncate max-w-[180px]">{t.table_name}</td>
                      <td className="p-2 text-right">{ratioBadge(t.heap_hit_ratio)}</td>
                      <td className="p-2 text-right">{ratioBadge(t.idx_hit_ratio)}</td>
                      <td className="p-2 text-right text-muted-foreground">
                        {t.total_reads.toLocaleString("pt-BR")}
                      </td>
                      <td className="p-2 text-right text-muted-foreground">{t.table_size_pretty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
