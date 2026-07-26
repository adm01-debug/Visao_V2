import { useMemo, useState } from "react";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { FileText, Download, AlertTriangle, ShieldAlert, ScanFace, Camera, TrendingUp, Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { toast } from "sonner";
import {
  WeeklyIncidentDrilldown,
  type DrilldownSelection,
} from "@/components/reports/WeeklyIncidentDrilldown";

type Range = 7 | 14 | 30;
type Severity = "low" | "medium" | "high" | "critical";

const severityColor: Record<Severity, string> = {
  low: "hsl(var(--muted-foreground))",
  medium: "hsl(var(--info))",
  high: "hsl(var(--warning))",
  critical: "hsl(var(--destructive))",
};

const severityLabel: Record<Severity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

interface Alert {
  id: string;
  severity: Severity;
  title: string;
  camera_id: string | null;
  triggered_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

interface RecognitionLog {
  id: string;
  person_id: string | null;
  camera_id: string | null;
  recognized: boolean;
  timestamp: string;
}

export default function WeeklyReportPage() {
  const [range, setRange] = useState<Range>(7);
  const [exporting, setExporting] = useState(false);
  const [selection, setSelection] = useState<DrilldownSelection | null>(null);

  const { start, end } = useMemo(() => {
    const e = endOfDay(new Date());
    const s = startOfDay(subDays(e, range - 1));
    return { start: s, end: e };
  }, [range]);

  // ------- Alerts
  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ["report-alerts", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_alerts")
        .select("id, severity, title, camera_id, triggered_at, resolved_at, acknowledged_at")
        .gte("triggered_at", start.toISOString())
        .lte("triggered_at", end.toISOString())
        .order("triggered_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  // ------- Panic events (timestamps para aplicar a janela de produtividade)
  const { data: panicEvents } = useQuery({
    queryKey: ["report-panics", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("panic_events")
        .select("id, created_at")
        .gte("created_at", start.toISOString())
        .lte("created_at", end.toISOString())
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; created_at: string }>;
    },
  });


  // ------- Recognition (productivity)
  const { data: recognitions, isLoading: loadingReco } = useQuery({
    queryKey: ["report-recognitions", start.toISOString(), end.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recognition_logs")
        .select("id, person_id, camera_id, recognized, timestamp")
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .limit(5000);
      if (error) throw error;
      return (data ?? []) as RecognitionLog[];
    },
  });

  // ------- Cameras (for names)
  const { data: cameras } = useQuery({
    queryKey: ["report-cameras"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cameras").select("id, name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const cameraName = (id: string | null) =>
    (id && cameras?.find((c) => c.id === id)?.name) || "Câmera desconhecida";

  // ------- Aggregations
  const bySeverity = useMemo(() => {
    const acc: Record<Severity, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    alerts?.forEach((a) => {
      acc[a.severity] = (acc[a.severity] ?? 0) + 1;
    });
    return acc;
  }, [alerts]);

  const byDay = useMemo(() => {
    const days = eachDayOfInterval({ start, end });
    return days.map((d) => {
      const key = format(d, "dd/MM");
      const dayAlerts = alerts?.filter((a) => format(new Date(a.triggered_at), "dd/MM") === key) ?? [];
      const dayReco = recognitions?.filter((r) => format(new Date(r.timestamp), "dd/MM") === key) ?? [];
      return {
        dia: key,
        incidentes: dayAlerts.length,
        criticos: dayAlerts.filter((a) => a.severity === "critical" || a.severity === "high").length,
        reconhecimentos: dayReco.filter((r) => r.recognized).length,
      };
    });
  }, [alerts, recognitions, start, end]);

  const byCamera = useMemo(() => {
    const acc = new Map<string, number>();
    alerts?.forEach((a) => {
      if (!a.camera_id) return;
      acc.set(a.camera_id, (acc.get(a.camera_id) ?? 0) + 1);
    });
    return Array.from(acc.entries())
      .map(([id, count]) => ({ id, camera: cameraName(id), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [alerts, cameras]);

  const totalAlerts = alerts?.length ?? 0;
  const resolvedAlerts = alerts?.filter((a) => a.resolved_at).length ?? 0;
  const ackAlerts = alerts?.filter((a) => a.acknowledged_at).length ?? 0;
  const avgMTTA = useMemo(() => {
    const acks = alerts?.filter((a) => a.acknowledged_at) ?? [];
    if (acks.length === 0) return 0;
    const totalMs = acks.reduce(
      (sum, a) => sum + (new Date(a.acknowledged_at!).getTime() - new Date(a.triggered_at).getTime()),
      0
    );
    return Math.round(totalMs / acks.length / 60000);
  }, [alerts]);

  const totalReco = recognitions?.length ?? 0;
  const recognizedCount = recognitions?.filter((r) => r.recognized).length ?? 0;
  const uniquePersons = new Set(recognitions?.filter((r) => r.person_id).map((r) => r.person_id)).size;
  const recognitionRate = totalReco > 0 ? Math.round((recognizedCount / totalReco) * 100) : 0;

  const pieData = (Object.keys(bySeverity) as Severity[])
    .map((s) => ({ name: severityLabel[s], value: bySeverity[s], key: s }))
    .filter((d) => d.value > 0);

  const exportPdf = async () => {
    setExporting(true);
    try {
      const { generatePDFReport } = await import("@/lib/pdfGenerator");
      const doc = await generatePDFReport({
        title: "Relatório Semanal de Segurança e Produtividade",
        subtitle: `Últimos ${range} dias · VISÃO`,
        dateRange: { start, end },
        generatedAt: new Date(),
        sections: [
          {
            title: "Resumo Executivo",
            type: "summary",
            data: [
              { label: "Incidentes", value: totalAlerts },
              { label: "Críticos + Alta", value: bySeverity.critical + bySeverity.high },
              { label: "Pânico", value: panics ?? 0 },
              { label: "MTTA (min)", value: avgMTTA },
              { label: "Reconhecimentos", value: recognizedCount },
              { label: "Pessoas Únicas", value: uniquePersons },
              { label: "Taxa Reconhec.", value: `${recognitionRate}%` },
              { label: "Alertas Resolvidos", value: resolvedAlerts },
            ],
          },
          {
            title: "Incidentes por Dia",
            type: "table",
            data: {
              headers: ["Dia", "Incidentes", "Críticos/Alta", "Reconhecimentos"],
              rows: byDay.map((d) => [d.dia, d.incidentes, d.criticos, d.reconhecimentos]),
            },
          },
          {
            title: "Top Câmeras com Incidentes",
            type: "table",
            data: {
              headers: ["Câmera", "Incidentes"],
              rows: byCamera.map((c) => [c.camera, c.count]),
            },
          },
          {
            title: "Distribuição por Severidade",
            type: "table",
            data: {
              headers: ["Severidade", "Quantidade"],
              rows: (Object.keys(bySeverity) as Severity[]).map((s) => [severityLabel[s], bySeverity[s]]),
            },
          },
        ],
      });
      doc.save(`relatorio-semanal-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success("Relatório exportado em PDF");
    } catch (e) {
      toast.error(`Erro ao gerar PDF: ${e instanceof Error ? e.message : "desconhecido"}`);
    } finally {
      setExporting(false);
    }
  };

  const loading = loadingAlerts || loadingReco;

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <PageMeta
        title="Relatório Semanal"
        description="Incidentes detectados e métricas de produtividade do time nos últimos dias."
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Relatório Semanal
          </h1>
          <p className="text-muted-foreground mt-1">
            Incidentes de segurança e produtividade do time entre{" "}
            <strong>{format(start, "dd 'de' MMM", { locale: ptBR })}</strong> e{" "}
            <strong>{format(end, "dd 'de' MMM yyyy", { locale: ptBR })}</strong>.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(range)} onValueChange={(v) => setRange(Number(v) as Range)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportPdf} disabled={exporting || loading}>
            {exporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* KPIs — Incidentes */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5 text-warning" />}
          label="Incidentes"
          value={totalAlerts}
          hint={`${bySeverity.critical} críticos · ${bySeverity.high} alta`}
          loading={loading}
        />
        <KpiCard
          icon={<ShieldAlert className="h-5 w-5 text-destructive" />}
          label="Eventos de pânico"
          value={panics ?? 0}
          hint="Botão de pânico acionado"
          loading={loading}
        />
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-success" />}
          label="MTTA (min)"
          value={avgMTTA}
          hint={`${ackAlerts} reconhecidos · ${resolvedAlerts} resolvidos`}
          loading={loading}
        />
        <KpiCard
          icon={<ScanFace className="h-5 w-5 text-primary" />}
          label="Reconhecimentos"
          value={recognizedCount}
          hint={`${uniquePersons} pessoas · ${recognitionRate}% taxa`}
          loading={loading}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Incidentes e Produtividade por Dia</CardTitle>
            <CardDescription>Clique em uma barra para detalhar os incidentes do dia</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" stroke="hsl(var(--muted-foreground))" />
                  <YAxis stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="incidentes"
                    name="Incidentes"
                    fill="hsl(var(--warning))"
                    cursor="pointer"
                    onClick={(d: { dia?: string }) => d?.dia && setSelection({ day: d.dia })}
                  />
                  <Bar
                    dataKey="criticos"
                    name="Críticos/Alta"
                    fill="hsl(var(--destructive))"
                    cursor="pointer"
                    onClick={(d: { dia?: string }) =>
                      d?.dia && setSelection({ day: d.dia, criticalOnly: true })
                    }
                  />
                  <Bar dataKey="reconhecimentos" name="Reconhecimentos" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severidade</CardTitle>
            <CardDescription>Clique em uma fatia para detalhar</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {loading ? (
              <Skeleton className="w-full h-full" />
            ) : pieData.length === 0 ? (
              <p className="text-muted-foreground text-center py-12">Sem incidentes no período.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                    cursor="pointer"
                    onClick={(d: { key?: Severity }) => d?.key && setSelection({ severity: d.key })}
                  >
                    {pieData.map((d) => (
                      <Cell key={d.key} fill={severityColor[d.key]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Drill-down */}
      <WeeklyIncidentDrilldown
        alerts={alerts ?? []}
        cameras={cameras ?? []}
        selection={selection}
        onClear={() => setSelection(null)}
      />

      {/* Top câmeras */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Top Câmeras com Incidentes
          </CardTitle>
          <CardDescription>Clique em uma câmera para listar seus incidentes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : byCamera.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum incidente registrado.</p>
          ) : (
            <div className="space-y-2">
              {byCamera.map((c, idx) => (
                <button
                  type="button"
                  key={c.camera}
                  onClick={() => setSelection({ cameraId: c.id })}
                  className="w-full flex items-center justify-between p-3 border rounded-lg bg-card text-left transition-colors hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 justify-center">
                      {idx + 1}
                    </Badge>
                    <span className="font-medium">{c.camera}</span>
                  </div>
                  <Badge variant={idx === 0 ? "destructive" : "secondary"}>{c.count} alertas</Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  hint,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon}
        </div>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}
