import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface Row {
  schema_name: string;
  table_name: string;
  index_name: string;
  is_unique: boolean;
  is_ready: boolean;
  is_live: boolean;
  index_size_bytes: number;
  index_size_pretty: string;
  severity: "critical" | "warning";
  recommendation: string;
}

export function InvalidIndexesCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["invalid-indexes"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_invalid_indexes" as never);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = data ?? [];
  const criticals = rows.filter((r) => r.severity === "critical").length;

  const copy = async (sql: string) => {
    await navigator.clipboard.writeText(sql);
    toast.success("Comando copiado");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertOctagon className="h-5 w-5" />
            Índices inválidos
            {criticals > 0 && <Badge variant="destructive">{criticals} crítico(s)</Badge>}
          </CardTitle>
          <CardDescription>
            Índices marcados como inválidos ou incompletos — normalmente resultado de{" "}
            <code>CREATE INDEX CONCURRENTLY</code> que falhou. Consomem espaço e são ignorados pelo
            planner. UNIQUE inválido não aplica a restrição de unicidade.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum índice inválido detectado. ✅
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={`${r.schema_name}.${r.index_name}`}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={r.severity === "critical" ? "destructive" : "secondary"}>
                      {r.severity}
                    </Badge>
                    {r.is_unique && <Badge variant="outline">UNIQUE</Badge>}
                    {!r.is_ready && <Badge variant="outline">not ready</Badge>}
                    {!r.is_live && <Badge variant="outline">not live</Badge>}
                    <span className="font-mono text-sm">
                      {r.schema_name}.{r.index_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · em {r.table_name} · {r.index_size_pretty}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copy(r.recommendation)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar REINDEX
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {r.recommendation}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
