import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { Activity, RefreshCw, AlertTriangle, PlayCircle } from "lucide-react";
import { toast } from "sonner";

interface Staleness {
  schema_name: string;
  table_name: string;
  n_live_tup: number;
  n_mod_since_analyze: number;
  mod_ratio_pct: number | null;
  last_analyze: string | null;
  last_autoanalyze: string | null;
  hours_since_analyze: number | null;
  severity: "critical" | "warning" | "info" | "never";
}

const severityVariant: Record<Staleness["severity"], "destructive" | "secondary" | "outline"> = {
  critical: "destructive",
  warning: "secondary",
  never: "secondary",
  info: "outline",
};

export function StatsStalenessCard() {
  const qc = useQueryClient();
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["admin-stats-staleness"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_stats_staleness", { _min_mod_since: 1000 });
      if (error) throw error;
      return (data ?? []) as Staleness[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const analyze = useMutation({
    mutationFn: async (table: string) => {
      const { data, error } = await supabase.rpc("analyze_table", { _table_name: table });
      if (error) throw error;
      return data as { ok: boolean; table: string; duration_ms: number };
    },
    onSuccess: (res) => {
      toast.success(`ANALYZE em ${res.table} concluído em ${res.duration_ms} ms`);
      qc.invalidateQueries({ queryKey: ["admin-stats-staleness"] });
    },
    onError: (e: Error) => toast.error(`Falha no ANALYZE: ${e.message}`),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Frescor de estatísticas (planner)
          </CardTitle>
          <CardDescription>
            Tabelas com muitas modificações desde o último ANALYZE — estatísticas desatualizadas
            produzem planos ruins. Rode ANALYZE nos casos críticos.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Atualizar staleness"
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
          <p className="text-sm text-muted-foreground">
            Estatísticas frescas em todas as tabelas ativas. ✅
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline">{data.length} tabelas</Badge>
              <Badge variant="destructive">
                {data.filter((d) => d.severity === "critical").length} críticas
              </Badge>
              <Badge variant="secondary">
                {data.filter((d) => d.severity === "warning").length} atenção
              </Badge>
            </div>
            <ScrollArea className="h-72 rounded-md border">
              <ul className="divide-y">
                {data.map((s) => (
                  <li key={`${s.schema_name}.${s.table_name}`} className="p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <Badge variant={severityVariant[s.severity]} className="uppercase">
                          {s.severity}
                        </Badge>
                        <code className="text-xs font-mono truncate">{s.table_name}</code>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={analyze.isPending}
                        onClick={() => analyze.mutate(s.table_name)}
                      >
                        <PlayCircle className="h-3.5 w-3.5 mr-1" /> ANALYZE
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-4">
                      <span>
                        Modificações: <strong>{s.n_mod_since_analyze.toLocaleString("pt-BR")}</strong>
                        {s.mod_ratio_pct !== null && ` (${s.mod_ratio_pct}%)`}
                      </span>
                      <span>
                        Última análise:{" "}
                        {s.hours_since_analyze !== null
                          ? `${s.hours_since_analyze} h atrás`
                          : "nunca"}
                      </span>
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
