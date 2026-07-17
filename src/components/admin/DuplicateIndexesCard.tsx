import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Layers, RefreshCw, AlertTriangle } from "lucide-react";

interface DuplicateIndex {
  schema_name: string;
  table_name: string;
  index_a: string;
  index_b: string;
  size_a_pretty: string;
  size_b_pretty: string;
  relation: "identical" | "prefix";
  a_is_unique: boolean;
  b_is_unique: boolean;
  suggestion: string;
}

export function DuplicateIndexesCard() {
  const [copied, setCopied] = useState<string | null>(null);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-duplicate-indexes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_duplicate_indexes");
      if (error) throw error;
      return (data ?? []) as DuplicateIndex[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const copy = async (key: string, sql: string) => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* no-op */
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-4 w-4" /> Índices duplicados / redundantes
          </CardTitle>
          <CardDescription>
            Pares de índices idênticos ou onde um é prefixo do outro — remoção reduz escrita e disco.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar índices duplicados"
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
          <p className="text-sm text-muted-foreground">Nenhum índice duplicado identificado. ✅</p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{data.length} pares</Badge>
              <Badge variant="secondary">
                {data.filter((d) => d.relation === "identical").length} idênticos
              </Badge>
              <Badge variant="outline">
                {data.filter((d) => d.relation === "prefix").length} prefixo
              </Badge>
            </div>
            <ScrollArea className="h-72 rounded-md border">
              <ul className="divide-y">
                {data.map((d, i) => {
                  const key = `${d.index_a}-${d.index_b}-${i}`;
                  const copyable = d.suggestion.startsWith("DROP");
                  return (
                    <li key={key} className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                          <Badge
                            variant={d.relation === "identical" ? "destructive" : "outline"}
                            className="uppercase"
                          >
                            {d.relation}
                          </Badge>
                          <code className="font-mono truncate">
                            {d.schema_name}.{d.table_name}
                          </code>
                        </div>
                        {copyable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copy(key, d.suggestion)}
                            aria-label="Copiar SQL sugerido"
                          >
                            {copied === key ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <div>
                          <code className="font-mono">{d.index_a}</code> ({d.size_a_pretty}
                          {d.a_is_unique ? " · UNIQUE" : ""})
                        </div>
                        <div>
                          <code className="font-mono">{d.index_b}</code> ({d.size_b_pretty}
                          {d.b_is_unique ? " · UNIQUE" : ""})
                        </div>
                      </div>
                      <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                        <code>{d.suggestion}</code>
                      </pre>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
