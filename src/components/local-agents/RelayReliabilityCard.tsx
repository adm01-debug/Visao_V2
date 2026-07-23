import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, XCircle, Clock, Radio } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Row {
  agent_id: string;
  agent_name: string;
  total: number;
  completed: number;
  failed: number;
  expired: number;
  pending: number;
  success_rate: number | null;
  avg_latency_ms: number | null;
  p95_latency_ms: number | null;
  last_activity: string | null;
}

interface Props {
  hours?: number;
  className?: string;
}

/**
 * Painel de confiabilidade dos Agentes Locais: agrega agent_relay_tasks
 * por agente na janela recente e mostra taxa de sucesso, latência média
 * e p95. Fonte: RPC public.get_relay_agent_reliability (SECURITY DEFINER
 * escopada por auth.uid()).
 */
export function RelayReliabilityCard({ hours = 24, className }: Props) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["relay-reliability", hours],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_relay_agent_reliability", { _hours: hours });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Activity className="h-4 w-4 text-primary" />
          Confiabilidade dos Agentes Locais
          <Badge variant="outline" className="ml-auto text-[10px]">últimas {hours}h</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Skeleton className="h-24 w-full" />}
        {error && <p className="text-xs text-destructive">Falha ao carregar métricas.</p>}
        {!isLoading && !error && (data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">
            Nenhuma tarefa de relé nas últimas {hours}h. Cadastre um agente e roteie um comando PTZ ou port-probe.
          </p>
        )}
        {(data ?? []).map((r) => {
          const rate = r.success_rate ?? 0;
          const tone =
            rate >= 95 ? "text-success" : rate >= 80 ? "text-warning" : "text-destructive";
          return (
            <div
              key={r.agent_id}
              className="rounded-md border border-border/60 bg-background/40 p-2.5 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Radio className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium truncate">{r.agent_name}</span>
                </div>
                <span className={cn("text-xs font-mono font-semibold", tone)}>
                  {rate.toFixed(1)}%
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><CheckCircle2 className="h-2.5 w-2.5 text-success" />{r.completed}</span>
                <span className="flex items-center gap-1"><XCircle className="h-2.5 w-2.5 text-destructive" />{r.failed + r.expired}</span>
                <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{r.pending}</span>
                <span className="text-right font-mono">
                  {r.avg_latency_ms != null ? `${r.avg_latency_ms}ms` : "—"}
                  {r.p95_latency_ms != null && (
                    <span className="text-muted-foreground/70"> / p95 {r.p95_latency_ms}ms</span>
                  )}
                </span>
              </div>
              {r.last_activity && (
                <p className="text-[10px] text-muted-foreground">
                  Última atividade{" "}
                  {formatDistanceToNowStrict(new Date(r.last_activity), { addSuffix: true, locale: ptBR })}
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
