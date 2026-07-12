import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { AlertTriangle, Camera as CameraIcon, Filter, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

type Severity = "low" | "medium" | "high" | "critical";
type Status = "open" | "acknowledged" | "resolved" | "dismissed";

interface AlertRow {
  id: string;
  title: string;
  description: string | null;
  severity: Severity;
  status: Status;
  triggered_at: string;
  camera_id: string | null;
  event_id: string | null;
  camera: { name: string } | null;
  event: { event_type: string } | null;
}

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "Crítico", high: "Alto", medium: "Médio", low: "Baixo",
};
const SEVERITY_TONE: Record<Severity, string> = {
  critical: "bg-destructive text-destructive-foreground",
  high: "bg-warning text-warning-foreground",
  medium: "bg-primary/80 text-primary-foreground",
  low: "bg-muted text-muted-foreground",
};
const RANGES = {
  "1h": 1, "6h": 6, "24h": 24, "7d": 24 * 7, "30d": 24 * 30,
} as const;
type RangeKey = keyof typeof RANGES;

export default function EventAlertsDashboardPage() {
  const { user } = useAuth();
  const [rangeKey, setRangeKey] = useState<RangeKey>("24h");
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [cameraId, setCameraId] = useState<string>("all");
  const [riskType, setRiskType] = useState<string>("all");

  const since = useMemo(
    () => subHours(new Date(), RANGES[rangeKey]).toISOString(),
    [rangeKey],
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["event-alerts-dashboard", since, severity, cameraId, riskType, user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from("event_alerts")
        .select(
          "id,title,description,severity,status,triggered_at,camera_id,event_id," +
            "camera:cameras(name),event:camera_events(event_type)",
        )
        .gte("triggered_at", since)
        .order("triggered_at", { ascending: false })
        .limit(500);
      if (severity !== "all") q = q.eq("severity", severity);
      if (cameraId !== "all") q = q.eq("camera_id", cameraId);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as AlertRow[];
      if (riskType !== "all") rows = rows.filter((r) => r.event?.event_type === riskType);
      return rows;
    },
  });

  const alerts = data ?? [];

  const bySeverity = useMemo(() => {
    const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const a of alerts) counts[a.severity]++;
    return counts;
  }, [alerts]);

  const byCamera = useMemo(() => {
    const m = new Map<string, { name: string; total: number; critical: number; high: number }>();
    for (const a of alerts) {
      const key = a.camera_id ?? "sem-camera";
      const name = a.camera?.name ?? "Câmera desconhecida";
      const cur = m.get(key) ?? { name, total: 0, critical: 0, high: 0 };
      cur.total++;
      if (a.severity === "critical") cur.critical++;
      if (a.severity === "high") cur.high++;
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 10);
  }, [alerts]);

  const timeline = useMemo(() => {
    const hours = RANGES[rangeKey];
    const bucketMs = hours <= 24 ? 60 * 60 * 1000 : 6 * 60 * 60 * 1000;
    const bucketFmt = hours <= 24 ? "HH:mm" : "dd/MM HH'h'";
    const now = Date.now();
    const start = now - hours * 60 * 60 * 1000;
    const buckets = new Map<number, { time: string; critical: number; high: number; medium: number; low: number }>();
    for (let t = Math.floor(start / bucketMs) * bucketMs; t <= now; t += bucketMs) {
      buckets.set(t, {
        time: format(new Date(t), bucketFmt, { locale: ptBR }),
        critical: 0, high: 0, medium: 0, low: 0,
      });
    }
    for (const a of alerts) {
      const t = Math.floor(new Date(a.triggered_at).getTime() / bucketMs) * bucketMs;
      const b = buckets.get(t);
      if (b) b[a.severity]++;
    }
    return [...buckets.values()];
  }, [alerts, rangeKey]);

  const riskTypes = useMemo(() => {
    const s = new Set<string>();
    for (const a of alerts) if (a.event?.event_type) s.add(a.event.event_type);
    return [...s].sort();
  }, [alerts]);

  const cameras = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of alerts) if (a.camera_id) m.set(a.camera_id, a.camera?.name ?? a.camera_id);
    return [...m.entries()];
  }, [alerts]);

  return (
    <div className="space-y-6 p-4 md:p-6 mb-mobile-nav">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard de Alertas</h1>
          <p className="text-sm text-muted-foreground">
            Alertas por severidade e câmera, com timeline e filtros.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </header>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="6h">Últimas 6h</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severity} onValueChange={(v) => setSeverity(v as Severity | "all")}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Severidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas severidades</SelectItem>
              {SEVERITIES.map((s) => (
                <SelectItem key={s} value={s}>{SEVERITY_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={cameraId} onValueChange={setCameraId}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Câmera" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as câmeras</SelectItem>
              {cameras.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={riskType} onValueChange={setRiskType}>
            <SelectTrigger className="w-52"><SelectValue placeholder="Tipo de risco" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {riskTypes.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Badge variant="outline" className="ml-auto">{alerts.length} alertas</Badge>
        </CardContent>
      </Card>

      {/* Cards por severidade */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {SEVERITIES.map((s) => (
          <Card key={s}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {SEVERITY_LABEL[s]}
                </span>
                <span className={`h-2 w-2 rounded-full ${SEVERITY_TONE[s]}`} />
              </div>
              <div className="text-3xl font-bold mt-2 text-foreground">{bySeverity[s]}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Timeline de alertas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--popover-foreground))",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="critical" stackId="a" fill="hsl(var(--destructive))" />
                  <Bar dataKey="high" stackId="a" fill="hsl(var(--warning))" />
                  <Bar dataKey="medium" stackId="a" fill="hsl(var(--primary))" />
                  <Bar dataKey="low" stackId="a" fill="hsl(var(--muted-foreground))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top câmeras + lista */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CameraIcon className="h-4 w-4" /> Top câmeras
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {byCamera.length === 0 && (
              <p className="text-sm text-muted-foreground">Sem alertas no período.</p>
            )}
            {byCamera.map((c) => (
              <div key={c.name} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <span className="text-sm font-medium text-foreground truncate">{c.name}</span>
                <div className="flex gap-2 items-center">
                  {c.critical > 0 && (
                    <Badge className={SEVERITY_TONE.critical}>{c.critical} crít</Badge>
                  )}
                  {c.high > 0 && (
                    <Badge className={SEVERITY_TONE.high}>{c.high} alto</Badge>
                  )}
                  <Badge variant="outline">{c.total}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Alertas recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-80 pr-3">
              <div className="space-y-2">
                {isLoading && Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
                {!isLoading && alerts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum alerta encontrado.</p>
                )}
                {alerts.slice(0, 50).map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-3 hover:bg-accent/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{a.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {a.camera?.name ?? "—"} · {a.event?.event_type ?? "evento"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={SEVERITY_TONE[a.severity]}>
                          {SEVERITY_LABEL[a.severity]}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(a.triggered_at), "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
