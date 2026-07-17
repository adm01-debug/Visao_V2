import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PowerOff, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface Row {
  schema_name: string;
  table_name: string;
  trigger_name: string;
  trigger_state: string;
  trigger_kind: string;
  function_name: string;
  severity: "critical" | "warning" | "info";
  recommendation: string;
}

export function DisabledTriggersCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["disabled-triggers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_disabled_triggers" as never);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = data ?? [];
  const criticals = rows.filter((r) => r.severity === "critical").length;

  const badgeVariant = (s: Row["severity"]) =>
    s === "critical" ? "destructive" : s === "warning" ? "secondary" : "outline";

  const copy = async (sql: string) => {
    await navigator.clipboard.writeText(sql);
    toast.success("Comando copiado");
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PowerOff className="h-5 w-5" />
            Triggers desabilitados
            {criticals > 0 && <Badge variant="destructive">{criticals} crítico(s)</Badge>}
          </CardTitle>
          <CardDescription>
            Detecta triggers de auditoria, RLS e updated_at que estão OFF ou apenas em replica.
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
            Todos os triggers do schema public estão habilitados. ✅
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={`${r.schema_name}.${r.table_name}.${r.trigger_name}`}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={badgeVariant(r.severity)}>{r.severity}</Badge>
                    <Badge variant="outline">{r.trigger_state}</Badge>
                    <Badge variant="outline">{r.trigger_kind}</Badge>
                    <span className="font-mono text-sm">
                      {r.schema_name}.{r.table_name}
                    </span>
                    <span className="text-xs text-muted-foreground">· {r.trigger_name}</span>
                  </div>
                  {r.trigger_state === "disabled" && (
                    <Button size="sm" variant="ghost" onClick={() => copy(r.recommendation)}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copiar ENABLE
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">fn: {r.function_name}</p>
                <p className="text-xs text-muted-foreground">{r.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
