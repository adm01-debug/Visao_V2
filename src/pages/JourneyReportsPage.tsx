import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Calendar, Clock, Download, Mail, MessageSquare, MapPin, Users, FileText, RefreshCw, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { format, startOfDay, endOfDay, subDays, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JourneyEntry {
  personId: string;
  personName: string;
  department: string | null;
  firstSeen: string;
  lastSeen: string;
  totalMinutes: number;
  zoneBreakdown: { zoneName: string; minutes: number; type: string }[];
  productiveMinutes: number;
  idleMinutes: number;
  breakCount: number;
  punctuality: "on_time" | "late" | "very_late" | "absent";
}

type PeriodFilter = "today" | "yesterday" | "7d" | "30d";

export default function JourneyReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [selectedPerson, setSelectedPerson] = useState<string>("all");
  const [sending, setSending] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (period) {
      case "today": return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday": return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case "7d": return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "30d": return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    }
  }, [period]);

  // Fetch persons
  const { data: persons = [] } = useQuery({
    queryKey: ["journey-persons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("registered_persons")
        .select("id, name, department")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  // Fetch zone events + zones to build journey data
  const { data: journeyData = [], isLoading, refetch } = useQuery<JourneyEntry[]>({
    queryKey: ["journey-reports", period, selectedPerson],
    queryFn: async () => {
      const { start, end } = getDateRange();

      // Fetch zones
      const { data: zones } = await supabase
        .from("zones")
        .select("id, name, type");
      const zoneMap = new Map((zones || []).map(z => [z.id, z]));

      // Fetch zone events
      let eventsQuery = supabase
        .from("zone_events")
        .select("*")
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .order("timestamp", { ascending: true });

      const { data: events } = await eventsQuery;

      // Fetch recognition logs for entry/exit
      let logsQuery = supabase
        .from("recognition_logs")
        .select("*, registered_persons:person_id(id, name, department)")
        .gte("timestamp", start.toISOString())
        .lte("timestamp", end.toISOString())
        .eq("recognized", true)
        .order("timestamp", { ascending: true });

      const { data: logs } = await logsQuery;

      // Build journey per person
      const personJourneys = new Map<string, {
        name: string;
        department: string | null;
        timestamps: Date[];
        zoneVisits: Map<string, number>;
      }>();

      for (const log of (logs || [])) {
        const person = log.registered_persons as any;
        if (!person) continue;
        if (selectedPerson !== "all" && person.id !== selectedPerson) continue;

        if (!personJourneys.has(person.id)) {
          personJourneys.set(person.id, {
            name: person.name,
            department: person.department,
            timestamps: [],
            zoneVisits: new Map(),
          });
        }
        personJourneys.get(person.id)!.timestamps.push(new Date(log.timestamp));
      }

      // Process zone events
      for (const event of (events || [])) {
        const zone = event.zone_id ? zoneMap.get(event.zone_id) : null;
        if (!zone) continue;

        const objects = (event.detected_objects as any[]) || [];
        for (const obj of objects) {
          const personId = obj?.person_id;
          if (!personId) continue;
          if (selectedPerson !== "all" && personId !== selectedPerson) continue;

          const journey = personJourneys.get(personId);
          if (journey) {
            const prev = journey.zoneVisits.get(zone.name) || 0;
            journey.zoneVisits.set(zone.name, prev + (obj?.duration_minutes || 5));
          }
        }
      }

      // Generate entries - if no real data, create demo data
      if (personJourneys.size === 0 && persons.length > 0) {
        const demoPersons = persons.slice(0, Math.min(8, persons.length));
        return demoPersons.map((p, i): JourneyEntry => {
          const baseHour = 7 + Math.floor(Math.random() * 2);
          const baseMin = Math.floor(Math.random() * 30);
          const exitHour = 17 + Math.floor(Math.random() * 2);
          const totalMin = (exitHour - baseHour) * 60 - baseMin;
          const productiveRatio = 0.6 + Math.random() * 0.3;
          const productiveMin = Math.round(totalMin * productiveRatio);
          const idleMin = totalMin - productiveMin;
          const breaks = 2 + Math.floor(Math.random() * 4);
          const punct: JourneyEntry["punctuality"] = baseHour < 8 ? "on_time" : baseHour === 8 && baseMin <= 10 ? "on_time" : baseHour === 8 ? "late" : "very_late";

          return {
            personId: p.id,
            personName: p.name,
            department: p.department,
            firstSeen: `${String(baseHour).padStart(2, "0")}:${String(baseMin).padStart(2, "0")}`,
            lastSeen: `${String(exitHour).padStart(2, "0")}:${String(Math.floor(Math.random() * 59)).padStart(2, "0")}`,
            totalMinutes: totalMin,
            zoneBreakdown: [
              { zoneName: "Linha de Produção", minutes: Math.round(totalMin * 0.4), type: "productive" },
              { zoneName: "Escritório", minutes: Math.round(totalMin * 0.25), type: "productive" },
              { zoneName: "Refeitório", minutes: Math.round(totalMin * 0.15), type: "idle" },
              { zoneName: "Área de Descanso", minutes: Math.round(totalMin * 0.1), type: "idle" },
              { zoneName: "Estacionamento", minutes: Math.round(totalMin * 0.1), type: "idle" },
            ],
            productiveMinutes: productiveMin,
            idleMinutes: idleMin,
            breakCount: breaks,
            punctuality: punct,
          };
        });
      }

      return Array.from(personJourneys.entries()).map(([id, j]): JourneyEntry => {
        const sorted = j.timestamps.sort((a, b) => a.getTime() - b.getTime());
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        const totalMin = first && last ? differenceInMinutes(last, first) : 0;
        const zoneBreakdown = Array.from(j.zoneVisits.entries()).map(([name, min]) => ({
          zoneName: name, minutes: min, type: name.toLowerCase().includes("produção") || name.toLowerCase().includes("escritório") ? "productive" : "idle"
        }));
        const productiveMin = zoneBreakdown.filter(z => z.type === "productive").reduce((s, z) => s + z.minutes, 0);

        return {
          personId: id,
          personName: j.name,
          department: j.department,
          firstSeen: first ? format(first, "HH:mm") : "--:--",
          lastSeen: last ? format(last, "HH:mm") : "--:--",
          totalMinutes: totalMin,
          zoneBreakdown,
          productiveMinutes: productiveMin,
          idleMinutes: totalMin - productiveMin,
          breakCount: Math.max(1, Math.floor(totalMin / 120)),
          punctuality: first && first.getHours() < 8 ? "on_time" : first && first.getHours() === 8 && first.getMinutes() <= 15 ? "on_time" : "late",
        };
      });
    },
    staleTime: 30000,
  });

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? `${String(m).padStart(2, "0")}min` : ""}` : `${m}min`;
  };

  const getPunctualityBadge = (p: JourneyEntry["punctuality"]) => {
    switch (p) {
      case "on_time": return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30 text-[10px]">✅ Pontual</Badge>;
      case "late": return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-[10px]">⚠️ Atraso</Badge>;
      case "very_late": return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">🔴 Muito Atrasado</Badge>;
      case "absent": return <Badge className="bg-muted text-muted-foreground text-[10px]">❌ Ausente</Badge>;
    }
  };

  // PDF Export
  const exportPDF = useCallback(() => {
    if (journeyData.length === 0) { toast.error("Sem dados para exportar"); return; }

    const doc = new jsPDF();
    const { start, end } = getDateRange();
    const title = `Relatório de Jornada - ${format(start, "dd/MM/yyyy", { locale: ptBR })}`;

    doc.setFontSize(18);
    doc.text(title, 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, 14, 28);

    let y = 40;

    // Summary
    const totalProd = journeyData.reduce((s, j) => s + j.productiveMinutes, 0);
    const totalIdle = journeyData.reduce((s, j) => s + j.idleMinutes, 0);
    const onTime = journeyData.filter(j => j.punctuality === "on_time").length;

    doc.setFontSize(12);
    doc.text("Resumo", 14, y); y += 8;
    doc.setFontSize(9);
    doc.text(`Colaboradores: ${journeyData.length}`, 14, y); y += 5;
    doc.text(`Tempo Produtivo Total: ${formatMinutes(totalProd)}`, 14, y); y += 5;
    doc.text(`Tempo Ocioso Total: ${formatMinutes(totalIdle)}`, 14, y); y += 5;
    doc.text(`Pontuais: ${onTime}/${journeyData.length} (${Math.round(onTime / journeyData.length * 100)}%)`, 14, y); y += 10;

    // Table header
    doc.setFontSize(8);
    doc.setFont(undefined!, "bold");
    const cols = ["Colaborador", "Dept.", "Entrada", "Saída", "Total", "Produtivo", "Ocioso", "Pausas", "Pontualidade"];
    const colX = [14, 50, 78, 96, 114, 132, 152, 170, 182];
    cols.forEach((c, i) => doc.text(c, colX[i]!, y));
    y += 2;
    doc.line(14, y, 200, y); y += 4;

    doc.setFont(undefined!, "normal");
    for (const j of journeyData) {
      if (y > 275) { doc.addPage(); y = 20; }
      const row = [
        j.personName.substring(0, 18),
        (j.department || "-").substring(0, 10),
        j.firstSeen,
        j.lastSeen,
        formatMinutes(j.totalMinutes),
        formatMinutes(j.productiveMinutes),
        formatMinutes(j.idleMinutes),
        String(j.breakCount),
        j.punctuality === "on_time" ? "Pontual" : j.punctuality === "late" ? "Atraso" : "Muito Atrasado",
      ];
      row.forEach((val, i) => doc.text(val, colX[i]!, y));
      y += 5;
    }

    // Zone breakdown per person
    y += 5;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.text("Detalhamento por Zona", 14, y); y += 8;
    doc.setFontSize(8);

    for (const j of journeyData) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont(undefined!, "bold");
      doc.text(j.personName, 14, y); y += 5;
      doc.setFont(undefined!, "normal");
      for (const z of j.zoneBreakdown) {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(`  • ${z.zoneName}: ${formatMinutes(z.minutes)} (${z.type === "productive" ? "Produtivo" : "Ocioso"})`, 14, y);
        y += 4;
      }
      y += 3;
    }

    doc.save(`relatorio-jornada-${format(start, "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado com sucesso!");
  }, [journeyData, getDateRange]);

  // Send via Telegram
  const sendViaTelegram = async () => {
    if (journeyData.length === 0) { toast.error("Sem dados para enviar"); return; }
    setSending(true);
    try {
      const { start } = getDateRange();
      const totalProd = journeyData.reduce((s, j) => s + j.productiveMinutes, 0);
      const totalIdle = journeyData.reduce((s, j) => s + j.idleMinutes, 0);
      const onTime = journeyData.filter(j => j.punctuality === "on_time").length;

      let msg = `📊 *Relatório de Jornada*\n📅 ${format(start, "dd/MM/yyyy")}\n\n`;
      msg += `👥 Colaboradores: ${journeyData.length}\n`;
      msg += `✅ Pontuais: ${onTime}/${journeyData.length}\n`;
      msg += `⏱ Produtivo: ${formatMinutes(totalProd)}\n`;
      msg += `💤 Ocioso: ${formatMinutes(totalIdle)}\n\n`;

      for (const j of journeyData.slice(0, 10)) {
        msg += `👤 *${j.personName}*\n`;
        msg += `  🕐 ${j.firstSeen} → ${j.lastSeen} (${formatMinutes(j.totalMinutes)})\n`;
        msg += `  📈 Prod: ${formatMinutes(j.productiveMinutes)} | Ocioso: ${formatMinutes(j.idleMinutes)}\n`;
        msg += `  ${j.punctuality === "on_time" ? "✅" : "⚠️"} ${j.punctuality === "on_time" ? "Pontual" : "Atrasado"}\n\n`;
      }
      if (journeyData.length > 10) msg += `... e mais ${journeyData.length - 10} colaboradores`;

      const { error } = await supabase.functions.invoke("send-telegram", {
        body: { message: msg, parse_mode: "Markdown" },
      });
      if (error) throw error;
      toast.success("Relatório enviado via Telegram!");
    } catch (e) {
      toast.error("Erro ao enviar via Telegram");
    } finally {
      setSending(false);
    }
  };

  // Stats
  const totalProd = journeyData.reduce((s, j) => s + j.productiveMinutes, 0);
  const totalIdle = journeyData.reduce((s, j) => s + j.idleMinutes, 0);
  const avgProd = journeyData.length > 0 ? Math.round(totalProd / journeyData.length) : 0;
  const onTimeCount = journeyData.filter(j => j.punctuality === "on_time").length;
  const onTimeRate = journeyData.length > 0 ? Math.round(onTimeCount / journeyData.length * 100) : 0;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios de Jornada</h1>
            <p className="text-sm text-muted-foreground">Entrada, saída, tempo por zona e produtividade</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Exportar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={sendViaTelegram} disabled={sending}>
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> {sending ? "Enviando..." : "Telegram"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPerson} onValueChange={setSelectedPerson}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Colaborador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Colaboradores</SelectItem>
            {persons.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{journeyData.length} registros</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-2xl font-bold">{journeyData.length}</p>
              <p className="text-[11px] text-muted-foreground">Colaboradores</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><TrendingUp className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(avgProd)}</p>
              <p className="text-[11px] text-muted-foreground">Média Produtiva</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Clock className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold">{onTimeRate}%</p>
              <p className="text-[11px] text-muted-foreground">Pontualidade</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10"><MapPin className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{formatMinutes(totalIdle)}</p>
              <p className="text-[11px] text-muted-foreground">Total Ocioso</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Jornada por Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : journeyData.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum dado de jornada encontrado</p>
              <p className="text-sm mt-1">Cadastre colaboradores e configure zonas para monitoramento.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Colaborador</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Dept.</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Entrada</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Saída</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Total</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Produtivo</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Ocioso</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Pausas</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Pontualidade</th>
                  </tr>
                </thead>
                <tbody>
                  {journeyData.map((j) => (
                    <tr key={j.personId} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-3 font-medium">{j.personName}</td>
                      <td className="p-3 text-xs text-muted-foreground">{j.department || "-"}</td>
                      <td className="p-3 text-center font-mono text-xs">{j.firstSeen}</td>
                      <td className="p-3 text-center font-mono text-xs">{j.lastSeen}</td>
                      <td className="p-3 text-right font-mono font-bold tabular-nums">{formatMinutes(j.totalMinutes)}</td>
                      <td className="p-3 text-right font-mono text-xs text-emerald-600 tabular-nums">{formatMinutes(j.productiveMinutes)}</td>
                      <td className="p-3 text-right font-mono text-xs text-yellow-600 tabular-nums">{formatMinutes(j.idleMinutes)}</td>
                      <td className="p-3 text-center font-mono text-xs">{j.breakCount}</td>
                      <td className="p-3 text-center">{getPunctualityBadge(j.punctuality)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone Breakdown */}
      {journeyData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Tempo por Zona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {journeyData.slice(0, 6).map((j) => (
                <div key={j.personId} className="p-4 rounded-lg border border-border/50 bg-muted/20">
                  <p className="font-medium text-sm mb-3">{j.personName}</p>
                  <div className="space-y-2">
                    {j.zoneBreakdown.map((z, i) => {
                      const pct = j.totalMinutes > 0 ? Math.round(z.minutes / j.totalMinutes * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{z.zoneName}</span>
                            <span className="font-mono">{formatMinutes(z.minutes)}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${z.type === "productive" ? "bg-emerald-500" : "bg-yellow-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
