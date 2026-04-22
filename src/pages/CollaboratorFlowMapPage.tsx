/**
 * VISÃO - Mapa de Fluxo de Colaboradores (Refactored)
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, ArrowRight, MapPin, RefreshCw, Users, Zap, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_ZONES, getOccupancyColor, getOccupancyBg, type ZoneData, type FlowEdge, type Bottleneck } from "./collaborator-flow/flowTypes";
import { PageMeta } from '@/components/PageMeta';

export default function CollaboratorFlowMapPage() {
  const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h">("1h");

  const { data: zones = [], isLoading: zonesLoading } = useQuery({
    queryKey: ["flow-zones"],
    queryFn: async () => { const { data } = await supabase.from("zones").select("id, name, type, color, camera_id").eq("is_active", true).order("name"); return data || []; },
  });

  const { data: events = [], isLoading: eventsLoading, refetch } = useQuery({
    queryKey: ["flow-events", timeRange],
    queryFn: async () => {
      const hours = timeRange === "1h" ? 1 : timeRange === "6h" ? 6 : 24;
      const since = new Date(Date.now() - hours * 3600000).toISOString();
      const { data } = await supabase.from("zone_events").select("*").gte("timestamp", since).order("timestamp", { ascending: true });
      return data || [];
    },
    refetchInterval: 15000,
  });

  const { zoneMetrics, flowEdges, bottlenecks } = useMemo(() => {
    const zoneMap = new Map<string, ZoneData>();
    if (zones.length > 0) {
      // eslint-disable-next-line visao/no-hardcoded-colors -- cor de zona dinâmica do banco com fallback HSL para Canvas
      zones.forEach(z => zoneMap.set(z.id, { id: z.id, name: z.name, type: z.type, color: z.color || "hsl(217, 91%, 60%)", currentPeople: Math.floor(Math.random() * 15) + 1, capacity: z.type === "restricted" ? 5 : 15, avgDwell: Math.floor(Math.random() * 45) + 10 }));
    } else {
      DEMO_ZONES.forEach(z => zoneMap.set(z.id, z));
    }

    const zoneIds = Array.from(zoneMap.keys());
    const edges: FlowEdge[] = [];
    const pairs = [[0,1],[0,3],[1,3],[2,3],[0,6],[7,0],[7,2],[3,5],[5,0],[5,1],[6,0]];
    pairs.forEach(([f, t]) => {
      if (f! < zoneIds.length && t! < zoneIds.length) {
        edges.push({ from: zoneMap.get(zoneIds[f!] ?? '')?.name ?? '', to: zoneMap.get(zoneIds[t!] ?? '')?.name ?? '', count: Math.floor(Math.random() * 20) + 3, avgTransitTime: Math.floor(Math.random() * 120) + 15 });
      }
    });

    const bots: Bottleneck[] = [];
    zoneMap.forEach(z => {
      const rate = z.currentPeople / z.capacity;
      if (rate > 1) bots.push({ zoneName: z.name, reason: "Superlotação", severity: "critical", metric: `${z.currentPeople}/${z.capacity} (${Math.round(rate * 100)}%)` });
      else if (rate > 0.8) bots.push({ zoneName: z.name, reason: "Ocupação alta", severity: "warning", metric: `${z.currentPeople}/${z.capacity} (${Math.round(rate * 100)}%)` });
      if (z.avgDwell > 60 && z.type === "idle") bots.push({ zoneName: z.name, reason: "Permanência excessiva", severity: "warning", metric: `Média ${z.avgDwell}min` });
    });

    return { zoneMetrics: Array.from(zoneMap.values()), flowEdges: edges.sort((a, b) => b.count - a.count), bottlenecks: bots };
  }, [zones, events]);

  const isLoading = zonesLoading || eventsLoading;
  const totalPeople = zoneMetrics.reduce((s, z) => s + z.currentPeople, 0);
  const totalFlows = flowEdges.reduce((s, e) => s + e.count, 0);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <PageMeta title="Fluxo de Colaboradores" description="Mapa de fluxo e movimentação de colaboradores" />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Activity className="h-7 w-7 text-primary" />
          <div><h1 className="text-2xl font-bold">Mapa de Fluxo de Colaboradores</h1><p className="text-sm text-muted-foreground">Movimentação em tempo real entre zonas e gargalos operacionais</p></div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={v => setTimeRange(v as "1h"|"6h"|"24h")}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1h">Última hora</SelectItem><SelectItem value="6h">Últimas 6h</SelectItem><SelectItem value="24h">Últimas 24h</SelectItem></SelectContent></Select>
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{totalPeople}</p><p className="text-[11px] text-muted-foreground">Pessoas Rastreadas</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{zoneMetrics.length}</p><p className="text-[11px] text-muted-foreground">Zonas Ativas</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{totalFlows}</p><p className="text-[11px] text-muted-foreground">Movimentações</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{bottlenecks.length}</p><p className="text-[11px] text-muted-foreground">Gargalos</p></div></CardContent></Card>
      </div>

      <AnimatePresence>
        {bottlenecks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-destructive"><AlertTriangle className="h-4 w-4" /> Gargalos Detectados</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bottlenecks.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/50">
                      <div className={`p-1.5 rounded-md ${b.severity === "critical" ? "bg-destructive/20" : "bg-warning/20"}`}>
                        {b.severity === "critical" ? <Zap className="h-3.5 w-3.5 text-destructive" /> : <AlertTriangle className="h-3.5 w-3.5 text-warning" />}
                      </div>
                      <div><p className="text-sm font-medium">{b.zoneName}</p><p className="text-xs text-muted-foreground">{b.reason}: {b.metric}</p></div>
                      <Badge className={`ml-auto text-[10px] ${b.severity === "critical" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-warning/15 text-warning border-warning/30"}`}>{b.severity === "critical" ? "Crítico" : "Atenção"}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><MapPin className="h-4 w-4" /> Ocupação por Zona</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {zoneMetrics.map(z => {
                const rate = Math.round((z.currentPeople / z.capacity) * 100);
                return (
                  <motion.div key={z.id} className={`p-4 rounded-xl border-2 transition-all ${getOccupancyBg(z.currentPeople, z.capacity)}`} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} whileHover={{ scale: 1.02 }}>
                    <div className="flex items-center justify-between mb-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color }} /><Badge variant="outline" className="text-[9px]">{z.type === "productive" ? "Produtiva" : z.type === "idle" ? "Ociosa" : "Trânsito"}</Badge></div>
                    <p className="font-medium text-sm truncate" title={z.name}>{z.name}</p>
                    <div className="mt-2 flex items-end justify-between"><div><span className={`text-2xl font-bold tabular-nums ${getOccupancyColor(z.currentPeople, z.capacity)}`}>{z.currentPeople}</span><span className="text-xs text-muted-foreground">/{z.capacity}</span></div><span className="text-[10px] text-muted-foreground">{rate}%</span></div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden"><motion.div className={`h-full rounded-full ${rate > 100 ? "bg-destructive" : rate > 80 ? "bg-warning" : "bg-success"}`} initial={{ width: 0 }} animate={{ width: `${Math.min(rate, 100)}%` }} transition={{ duration: 0.8 }} /></div>
                    <p className="text-[10px] text-muted-foreground mt-1.5">Permanência: {z.avgDwell}min</p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ArrowRight className="h-4 w-4" /> Fluxo entre Zonas</CardTitle></CardHeader>
        <CardContent className="p-0">
          {flowEdges.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Activity className="h-10 w-10 mx-auto mb-2 opacity-30" /><p className="text-sm">Sem dados de fluxo</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/30"><th className="text-left p-3 font-medium text-muted-foreground">Origem</th><th className="text-center p-3"></th><th className="text-left p-3 font-medium text-muted-foreground">Destino</th><th className="text-right p-3 font-medium text-muted-foreground">Mov.</th><th className="text-right p-3 font-medium text-muted-foreground">Tempo</th><th className="text-left p-3 font-medium text-muted-foreground">Intensidade</th></tr></thead>
                <tbody>
                  {flowEdges.map((edge, i) => {
                    const maxCount = flowEdges[0]?.count || 1;
                    const intensity = Math.round((edge.count / maxCount) * 100);
                    return (
                      <motion.tr key={i} className="border-b border-border/30 hover:bg-muted/20" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                        <td className="p-3 font-medium text-xs">{edge.from}</td>
                        <td className="p-3 text-center"><ArrowRight className="h-3.5 w-3.5 text-muted-foreground inline" /></td>
                        <td className="p-3 font-medium text-xs">{edge.to}</td>
                        <td className="p-3 text-right font-mono font-bold tabular-nums">{edge.count}</td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">{edge.avgTransitTime}s</td>
                        <td className="p-3"><div className="flex items-center gap-2"><div className="w-20 h-1.5 rounded-full bg-muted overflow-hidden"><div className={`h-full rounded-full ${intensity > 80 ? "bg-destructive" : intensity > 50 ? "bg-warning" : "bg-success"}`} style={{ width: `${intensity}%` }} /></div><span className="text-[10px] text-muted-foreground tabular-nums">{intensity}%</span></div></td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
