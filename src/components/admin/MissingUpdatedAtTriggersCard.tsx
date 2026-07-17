import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface Row {
  schema_name: string;
  table_name: string;
  column_name: string;
  has_trigger: boolean;
  is_partition: boolean;
  severity: "warning" | "info";
  recommendation: string;
}

export function MissingUpdatedAtTriggersCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["missing-updated-at-triggers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_missing_updated_at_triggers" as never);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = data ?? [];
  const warnings = rows.filter((r) => r.severity === "warning").length;

  const copy = async (sql: string) => {
    await navigator.clipboard.writeText(sql);
    toast.success("Comando copiado");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Triggers de updated_at ausentes
            {warnings > 0 && <Badge variant="secondary">{warnings} aviso(s)</Badge>}
          </CardTitle>
          <CardDescription>
            Tabelas com coluna updated_at mas sem trigger BEFORE UPDATE — dados de auditoria ficam
            desatualizados silenciosamente.
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
            Todas as tabelas com updated_at possuem trigger. ✅
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={`${r.schema_name}.${r.table_name}`}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={r.severity === "warning" ? "secondary" : "outline"}>
                      {r.severity}
                    </Badge>
                    {r.is_partition && <Badge variant="outline">partição</Badge>}
                    <span className="font-mono text-sm">
                      {r.schema_name}.{r.table_name}
                    </span>
                  </div>
                  {r.severity === "warning" && (
                    <Button size="sm" variant="ghost" onClick={() => copy(r.recommendation)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar CREATE TRIGGER
                    </Button>
                  )}
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
