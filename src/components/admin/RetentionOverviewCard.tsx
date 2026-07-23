import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

interface RetentionRow {
  job_name: string;
  last_run: string | null;
  hours_since_last: number | null;
  health: "ok" | "warn" | "stalled" | "never";
  runs_last_30d: number;
  deleted_last_30d: number;
  retention_days: number | null;
}

const HEALTH_META: Record<RetentionRow["health"], { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle2 }> = {
  ok: { label: "Saudável", variant: "default", icon: CheckCircle2 },
  warn: { label: "Atenção", variant: "secondary", icon: Clock },
  stalled: { label: "Parada", variant: "destructive", icon: AlertTriangle },
  never: { label: "Sem execuções", variant: "outline", icon: AlertTriangle },
};

export function RetentionOverviewCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["retention-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_retention_overview");
      if (error) throw error;
      return (data ?? []) as RetentionRow[];
    },
    refetchInterval: 5 * 60_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-muted-foreground" />
          Retenção automática de dados
        </CardTitle>
        <CardDescription>
          Visão consolidada dos jobs de purga (últimos 30 dias). Somente administradores.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-32 w-full" />}

        {error && (
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar. Apenas administradores têm acesso.
          </p>
        )}

        {data && data.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Última execução</TableHead>
                  <TableHead className="text-right">Execuções (30d)</TableHead>
                  <TableHead className="text-right">Registros apagados (30d)</TableHead>
                  <TableHead className="text-right">Retenção</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => {
                  const meta = HEALTH_META[row.health];
                  const Icon = meta.icon;
                  return (
                    <TableRow key={row.job_name}>
                      <TableCell className="font-mono text-xs">{row.job_name}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.hours_since_last !== null
                          ? `há ${row.hours_since_last}h`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">{row.runs_last_30d}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.deleted_last_30d.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {row.retention_days ? `${row.retention_days}d` : "—"}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
