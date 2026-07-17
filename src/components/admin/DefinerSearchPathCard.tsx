import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KeyRound, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface Row {
  schema_name: string;
  function_name: string;
  arguments: string;
  language: string;
  search_path_config: string;
  severity: "critical" | "warn" | "info";
  recommendation: string;
}

export function DefinerSearchPathCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["definer-search-path"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_definer_functions_without_search_path" as never,
      );
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = data ?? [];
  const criticals = rows.filter((r) => r.severity === "critical").length;

  const badgeVariant = (s: Row["severity"]) =>
    s === "critical" ? "destructive" : s === "warn" ? "secondary" : "outline";

  const copy = async (sql: string) => {
    await navigator.clipboard.writeText(sql);
    toast.success("Comando copiado");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            SECURITY DEFINER sem search_path
            {criticals > 0 && <Badge variant="destructive">{criticals} crítica(s)</Badge>}
          </CardTitle>
          <CardDescription>
            Detecta funções com privilégios elevados sem search_path fixo (risco de schema hijacking).
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
            Todas as funções DEFINER têm search_path fixo. ✅
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={`${r.schema_name}.${r.function_name}(${r.arguments})`}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={badgeVariant(r.severity)}>{r.severity}</Badge>
                    <Badge variant="outline">{r.language}</Badge>
                    <span className="font-mono text-sm">
                      {r.schema_name}.{r.function_name}
                    </span>
                  </div>
                  {r.severity !== "info" && (
                    <Button size="sm" variant="ghost" onClick={() => copy(r.recommendation)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar ALTER
                    </Button>
                  )}
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  args: {r.arguments || "—"}
                </p>
                <p className="text-xs font-mono text-muted-foreground">
                  search_path: {r.search_path_config}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
