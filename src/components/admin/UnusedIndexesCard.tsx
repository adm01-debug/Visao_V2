import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Database, RefreshCw, AlertTriangle } from "lucide-react";

interface UnusedIndex {
  schema_name: string;
  table_name: string;
  index_name: string;
  index_size_bytes: number;
  index_size_pretty: string;
  idx_scan: number;
  definition: string;
}

export function UnusedIndexesCard() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-unused-indexes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unused_indexes", {
        _min_size_mb: 1,
        _max_scans: 50,
      });
      if (error) throw error;
      return (data ?? []) as UnusedIndex[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const totalBytes = (data ?? []).reduce((acc, i) => acc + Number(i.index_size_bytes ?? 0), 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="h-4 w-4" /> Índices não utilizados
          </CardTitle>
          <CardDescription>
            Índices com ≤ 50 scans e ≥ 1MB — candidatos a remoção para liberar disco e reduzir custo de escrita.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar índices não utilizados"
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
          <p className="text-sm text-muted-foreground">Nenhum índice ocioso identificado. ✅</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{data.length} índices</Badge>
              <Badge variant="secondary">{totalMB} MB recuperáveis</Badge>
            </div>
            <ScrollArea className="h-64 rounded-md border">
              <ul className="divide-y">
                {data.map((idx) => (
                  <li key={`${idx.schema_name}.${idx.index_name}`} className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-xs font-mono truncate">
                        {idx.schema_name}.{idx.index_name}
                      </code>
                      <Badge variant={idx.idx_scan === 0 ? "destructive" : "outline"}>
                        {idx.idx_scan} scans
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Tabela: {idx.table_name} · Tamanho: {idx.index_size_pretty}
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
