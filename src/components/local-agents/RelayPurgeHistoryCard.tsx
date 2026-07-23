import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PurgeRun {
  id: string;
  executed_at: string;
  retention_days: number;
  deleted_count: number;
  expired_count: number;
  duration_ms: number;
}

const STALE_THRESHOLD_MS = 36 * 60 * 60 * 1000; // 36h — cron diário + folga

export function RelayPurgeHistoryCard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["agent-relay-purge-runs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_relay_purge_runs")
        .select("id, executed_at, retention_days, deleted_count, expired_count, duration_ms")
        .order("executed_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as PurgeRun[];
    },
    refetchInterval: 60_000,
  });

  const lastRun = data?.[0];
  const isStale =
    lastRun && Date.now() - new Date(lastRun.executed_at).getTime() > STALE_THRESHOLD_MS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5 text-muted-foreground" />
          Histórico de purga de tarefas de relé
        </CardTitle>
        <CardDescription>
          Retenção automática executada diariamente às 03:15 UTC. Mostra os últimos 30 ciclos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Skeleton className="h-40 w-full" />}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5" />
            <span>Somente administradores conseguem visualizar este histórico.</span>
          </div>
        )}

        {!isLoading && !error && data && data.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Nenhuma execução registrada ainda. A primeira purga rodará no próximo ciclo agendado.
          </p>
        )}

        {isStale && (
          <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 text-warning" />
            <span>
              A última execução foi há mais de 36 horas. O cron pode estar parado — verifique
              <code className="mx-1 rounded bg-muted px-1">pg_cron</code>.
            </span>
          </div>
        )}

        {data && data.length > 0 && (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead className="text-right">Apagadas</TableHead>
                  <TableHead className="text-right">Expiradas</TableHead>
                  <TableHead className="text-right">Retenção</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDistanceToNow(new Date(run.executed_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {run.deleted_count.toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {run.expired_count > 0 ? (
                        <Badge variant="secondary">{run.expired_count.toLocaleString("pt-BR")}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {run.retention_days}d
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {run.duration_ms}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
