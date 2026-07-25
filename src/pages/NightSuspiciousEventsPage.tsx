/**
 * VISÃO — Alertas Noturnos: Atividade Suspeita e Risco de Arrombamento
 *
 * Consolida alertas gerados pelo pipeline `process-frame` durante o período
 * noturno (19h–06h America/Sao_Paulo):
 *   - suspicious_night_activity (medium)
 *   - break_in_risk (critical)
 *   - loitering_at_night (high)
 */
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, ShieldAlert, RefreshCw, Footprints, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type NightKind = "suspicious_night_activity" | "break_in_risk" | "loitering_at_night";

interface AlertRow {
  id: string;
  title: string;
  description: string | null;
  severity: "low" | "medium" | "high" | "critical";
  triggered_at: string;
  status: string;
  camera_id: string | null;
  metadata: Record<string, unknown> | null;
}

const KIND_META: Record<NightKind, { label: string; icon: typeof Moon; tone: string }> = {
  suspicious_night_activity: { label: "Atividade suspeita", icon: Moon, tone: "bg-warning/15 text-warning border-warning/30" },
  break_in_risk: { label: "Risco de arrombamento", icon: ShieldAlert, tone: "bg-destructive/15 text-destructive border-destructive/30" },
  loitering_at_night: { label: "Permanência prolongada", icon: Footprints, tone: "bg-primary/15 text-primary border-primary/30" },
};

const severityTone = (s: AlertRow["severity"]) =>
  s === "critical" ? "bg-destructive text-destructive-foreground"
    : s === "high" ? "bg-warning text-warning-foreground"
    : s === "medium" ? "bg-primary/20 text-primary"
    : "bg-muted text-muted-foreground";

export default function NightSuspiciousEventsPage() {
  const [rows, setRows] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [kindFilter, setKindFilter] = useState<"all" | NightKind>("all");
  const [cameras, setCameras] = useState<Map<string, string>>(new Map());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: alerts }, { data: cams }] = await Promise.all([
        supabase
          .from("event_alerts")
          .select("id,title,description,severity,triggered_at,status,camera_id,metadata")
          .in("metadata->>kind", ["suspicious_night_activity", "break_in_risk", "loitering_at_night"])
          .order("triggered_at", { ascending: false })
          .limit(200),
        supabase.from("cameras").select("id,name"),
      ]);
      setRows((alerts ?? []) as AlertRow[]);
      setCameras(new Map((cams ?? []).map((c: { id: string; name: string }) => [c.id, c.name])));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const channel = supabase
      .channel("night-alerts-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_alerts" },
        (payload) => {
          const row = payload.new as AlertRow;
          const kind = (row.metadata as { kind?: string } | null)?.kind;
          if (kind && ["suspicious_night_activity", "break_in_risk", "loitering_at_night"].includes(kind)) {
            setRows((prev) => [row, ...prev].slice(0, 200));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(
    () => (kindFilter === "all"
      ? rows
      : rows.filter((r) => (r.metadata as { kind?: string } | null)?.kind === kindFilter)),
    [rows, kindFilter],
  );

  const kpis = useMemo(() => {
    const counts: Record<NightKind, number> = {
      suspicious_night_activity: 0,
      break_in_risk: 0,
      loitering_at_night: 0,
    };
    for (const r of rows) {
      const k = (r.metadata as { kind?: string } | null)?.kind as NightKind | undefined;
      if (k && k in counts) counts[k]++;
    }
    return counts;
  }, [rows]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Helmet>
        <title>Alertas Noturnos — VISÃO</title>
        <meta name="description" content="Alertas de atividade suspeita e risco de arrombamento no período noturno." />
      </Helmet>

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <Moon className="h-6 w-6 text-primary" />
            Alertas Noturnos
          </h1>
          <p className="text-sm text-muted-foreground">
            Atividade suspeita e risco de arrombamento entre 19h e 06h.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as typeof kindFilter)}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="break_in_risk">Risco de arrombamento</SelectItem>
              <SelectItem value="suspicious_night_activity">Atividade suspeita</SelectItem>
              <SelectItem value="loitering_at_night">Permanência prolongada</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={fetchData} disabled={loading} aria-label="Atualizar">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(KIND_META) as NightKind[]).map((k) => {
          const Meta = KIND_META[k];
          const Icon = Meta.icon;
          return (
            <Card key={k}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {Meta.label}
                  </span>
                  <Badge variant="outline" className={Meta.tone}>{kpis[k]}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Últimas 200 ocorrências.
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ocorrências recentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p className="text-sm">Sem ocorrências noturnas registradas.</p>
            </div>
          )}
          {filtered.map((row) => {
            const kind = (row.metadata as { kind?: NightKind } | null)?.kind;
            const Meta = kind ? KIND_META[kind] : null;
            const Icon = Meta?.icon ?? Moon;
            const camName = row.camera_id ? cameras.get(row.camera_id) ?? "Câmera" : "—";
            return (
              <div key={row.id} className="flex flex-col gap-2 rounded-lg border bg-card p-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${Meta?.tone ?? "bg-muted"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{row.title}</span>
                      <Badge className={severityTone(row.severity)}>{row.severity}</Badge>
                      {Meta && <Badge variant="outline" className={Meta.tone}>{Meta.label}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{row.description}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Câmera: <span className="font-medium">{camName}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(row.triggered_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
