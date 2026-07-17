import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";

interface Row {
  schema_name: string;
  table_name: string;
  constraint_name: string;
  constraint_type: string;
  definition: string;
  total_size_pretty: string;
  severity: "critical" | "warning" | "info";
  validate_sql: string;
  recommendation: string;
}

export function UnvalidatedConstraintsCard() {
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["unvalidated-constraints"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_unvalidated_constraints" as never);
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
            <ShieldAlert className="h-5 w-5" />
            Constraints NOT VALID pendentes
            {criticals > 0 && <Badge variant="destructive">{criticals} crítico(s)</Badge>}
          </CardTitle>
          <CardDescription>
            CHECK e FKs criadas com NOT VALID e ainda não promovidas via VALIDATE CONSTRAINT.
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
            Nenhuma constraint pendente de validação. ✅
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div
                key={`${r.schema_name}.${r.table_name}.${r.constraint_name}`}
                className="rounded-md border border-border p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={badgeVariant(r.severity)}>{r.severity}</Badge>
                    <Badge variant="outline">{r.constraint_type}</Badge>
                    <span className="font-mono text-sm">
                      {r.schema_name}.{r.table_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {r.constraint_name} · {r.total_size_pretty}
                    </span>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => copy(r.validate_sql)}>
                    <Copy className="h-3.5 w-3.5 mr-1" /> Copiar VALIDATE
                  </Button>
                </div>
                <pre className="text-xs bg-muted rounded p-2 overflow-x-auto">
                  {r.definition}
                </pre>
                <p className="text-xs text-muted-foreground">{r.recommendation}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
