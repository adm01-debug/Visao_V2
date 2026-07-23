/**
 * VISÃO — Status do monitor de alerta de prévias.
 *
 * Consulta a RPC `preview_success_alert` e exibe:
 *  - Taxa de sucesso da janela vs threshold configurado.
 *  - Badge saudável/atenção/crítico com tokens semânticos.
 *  - Controles para ajustar janela, mínimo de eventos e threshold ao vivo.
 *
 * Fire-and-forget: erros de RPC não quebram o painel — mostra estado inerte.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface AlertRow {
  window_hours: number;
  total_started: number;
  total_failed: number;
  total_relevant: number;
  success_rate: number | null;
  threshold_used: number;
  should_alert: boolean;
  generated_at: string;
}

export function PreviewAlertStatusCard() {
  const [windowHours, setWindowHours] = useState(1);
  const [minEvents, setMinEvents] = useState(50);
  const [threshold, setThreshold] = useState(0.9);

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["preview-alert-status", windowHours, minEvents, threshold],
    staleTime: 30_000,
    refetchInterval: 60_000,
    queryFn: async (): Promise<AlertRow | null> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: rows, error: err } = await (supabase as any).rpc(
        "preview_success_alert",
        {
          p_window_hours: windowHours,
          p_min_events: minEvents,
          p_threshold: threshold,
        },
      );
      if (err) throw new Error(err.message);
      const first = Array.isArray(rows) ? rows[0] : rows;
      return (first as AlertRow) ?? null;
    },
  });

  const status = useMemo(() => {
    if (!data) return { label: "Sem dados", tone: "muted" as const, icon: ShieldAlert };
    if (data.total_relevant < minEvents) {
      return { label: "Amostra insuficiente", tone: "muted" as const, icon: ShieldAlert };
    }
    if (data.should_alert) return { label: "Crítico", tone: "destructive" as const, icon: AlertTriangle };
    const rate = data.success_rate ?? 0;
    if (rate < threshold + 0.03) {
      return { label: "Atenção", tone: "warning" as const, icon: AlertTriangle };
    }
    return { label: "Saudável", tone: "success" as const, icon: CheckCircle2 };
  }, [data, minEvents, threshold]);

  const StatusIcon = status.icon;
  const successPct = data?.success_rate != null ? (Number(data.success_rate) * 100).toFixed(1) : "—";
  const thresholdPct = (threshold * 100).toFixed(0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" aria-hidden />
          <CardTitle className="text-base">Alerta de Saúde da Prévia</CardTitle>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => refetch()}
          disabled={isFetching}
          aria-label="Recalcular"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="pa-window" className="text-xs">Janela (h)</Label>
            <Input
              id="pa-window"
              type="number"
              min={1}
              max={72}
              value={windowHours}
              onChange={(e) => setWindowHours(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pa-min" className="text-xs">Mín. eventos</Label>
            <Input
              id="pa-min"
              type="number"
              min={1}
              value={minEvents}
              onChange={(e) => setMinEvents(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pa-threshold" className="text-xs">Threshold (%)</Label>
            <Input
              id="pa-threshold"
              type="number"
              min={1}
              max={100}
              value={Math.round(threshold * 100)}
              onChange={(e) => {
                const pct = Math.min(100, Math.max(1, Number(e.target.value) || 90));
                setThreshold(pct / 100);
              }}
            />
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : error ? (
          <p className="text-sm text-destructive">Falha ao consultar RPC: {(error as Error).message}</p>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StatusIcon
                  className={
                    status.tone === "destructive"
                      ? "h-5 w-5 text-destructive"
                      : status.tone === "warning"
                        ? "h-5 w-5 text-warning"
                        : status.tone === "success"
                          ? "h-5 w-5 text-success"
                          : "h-5 w-5 text-muted-foreground"
                  }
                  aria-hidden
                />
                <span className="text-sm font-medium">{status.label}</span>
              </div>
              <Badge
                variant={
                  status.tone === "destructive"
                    ? "destructive"
                    : status.tone === "success"
                      ? "default"
                      : "secondary"
                }
              >
                {successPct}% ≥ {thresholdPct}%
              </Badge>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
              <div>
                <dt>Iniciadas</dt>
                <dd className="font-medium text-foreground">{data?.total_started ?? 0}</dd>
              </div>
              <div>
                <dt>Falhas</dt>
                <dd className="font-medium text-foreground">{data?.total_failed ?? 0}</dd>
              </div>
              <div>
                <dt>Amostra</dt>
                <dd className="font-medium text-foreground">{data?.total_relevant ?? 0}</dd>
              </div>
              <div>
                <dt>Calculado</dt>
                <dd className="font-medium text-foreground">
                  {data?.generated_at
                    ? new Date(data.generated_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </dd>
              </div>
            </dl>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Reflete a mesma lógica do cron <code>preview-telemetry-alert</code> (a cada 15 min). Ajustes
          aqui são apenas para simulação — thresholds em produção vivem na Edge Function.
        </p>
      </CardContent>
    </Card>
  );
}

export default PreviewAlertStatusCard;
