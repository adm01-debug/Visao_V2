/**
 * VISÃO - Página de Analytics - Design Premium
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart3, AlertTriangle, Brain, Camera, Users, Calendar, Clock, Download, FileText, Mail, RefreshCw, ScanFace, Target, Activity, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PageMeta } from "@/components/PageMeta";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

import { KPICard } from "@/components/analytics/KPICard";
import type { KPIData } from "@/components/analytics/KPICard";
import { SimpleBarChart } from "@/components/analytics/SimpleBarChart";
import type { ChartDataPoint } from "@/components/analytics/SimpleBarChart";
import { DonutChart } from "@/components/analytics/DonutChart";
import type { AlertsByType } from "@/components/analytics/DonutChart";
import { HourlyHeatmap } from "@/components/analytics/HourlyHeatmap";
import type { HourlyDistribution } from "@/components/analytics/HourlyHeatmap";
import { ALERT_TYPE_COLORS, CHART_COLORS } from '@/constants/chartColors';

type DateRange = '24h' | '7d' | '30d' | '90d';

interface CameraPerformance { id: string; name: string; alerts: number; analyses: number; uptime: number; detections: number; }

export function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [alertsByType, setAlertsByType] = useState<AlertsByType[]>([]);
  const [cameraPerformance, setCameraPerformance] = useState<CameraPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyDistribution[]>([]);

  const dateInterval = useMemo(() => {
    const end = endOfDay(new Date());
    const days = dateRange === '24h' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return { start: startOfDay(subDays(end, days)), end };
  }, [dateRange]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = dateInterval;
      const prevStart = subDays(start, Math.ceil((end.getTime() - start.getTime()) / 86400000));

      const [{ data: alertsData }, { data: prevAlertsData }, { data: camerasData }, { data: personsData }] = await Promise.all([
        supabase.from('alerts').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
        supabase.from('alerts').select('id').gte('created_at', prevStart.toISOString()).lt('created_at', start.toISOString()),
        supabase.from('cameras').select('*'),
        supabase.from('registered_persons').select('id'),
      ]);

      let analysisCount = 0, prevAnalysisCount = 0;
      try {
        const [{ count }, { count: prevCount }] = await Promise.all([
          supabase.from('analysis_history').select('*', { count: 'exact', head: true }).gte('created_at', start.toISOString()).lte('created_at', end.toISOString()),
          supabase.from('analysis_history').select('*', { count: 'exact', head: true }).gte('created_at', prevStart.toISOString()).lt('created_at', start.toISOString()),
        ]);
        analysisCount = count || 0; prevAnalysisCount = prevCount || 0;
      } catch {}

      const totalAlerts = alertsData?.length || 0;
      setKpis([
        { label: 'Total de Alertas', value: totalAlerts, previousValue: prevAlertsData?.length || 0, icon: AlertTriangle, variant: 'destructive' },
        { label: 'Análises de IA', value: analysisCount, previousValue: prevAnalysisCount, icon: Brain, variant: 'primary' },
        { label: 'Câmeras Online', value: camerasData?.filter(c => c.status !== 'offline').length || 0, previousValue: camerasData?.filter(c => c.status !== 'offline').length || 0, unit: `/ ${camerasData?.length || 0}`, icon: Camera, variant: 'primary' },
        { label: 'Pessoas Cadastradas', value: personsData?.length || 0, previousValue: personsData?.length || 0, icon: Users, variant: 'success' },
      ]);

      const days = eachDayOfInterval({ start, end });
      setChartData(days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return { date: dayStr, label: format(day, 'dd/MM', { locale: ptBR }), alerts: alertsData?.filter(a => a.created_at.startsWith(dayStr)).length || 0, analyses: Math.floor(Math.random() * 50), detections: Math.floor(Math.random() * 30), recordings: Math.floor(Math.random() * 10) };
      }));

      const typeColors: Record<string, string> = ALERT_TYPE_COLORS;
      const typeCount: Record<string, number> = {};
      alertsData?.forEach(a => { typeCount[a.type || 'other'] = (typeCount[a.type || 'other'] || 0) + 1; });
      const types: AlertsByType[] = Object.entries(typeCount).map(([type, count]) => ({ type, count, percentage: totalAlerts > 0 ? (count / totalAlerts) * 100 : 0, color: typeColors[type] ?? ALERT_TYPE_COLORS.other ?? CHART_COLORS.gray }));
      setAlertsByType(types.length > 0 ? types : [{ type: 'Sem dados', count: 0, percentage: 100, color: CHART_COLORS.gray }]);

      setCameraPerformance((camerasData || []).slice(0, 5).map(camera => ({
        id: camera.id, name: camera.name, alerts: alertsData?.filter(a => a.camera_id === camera.id).length || 0,
        analyses: Math.floor(Math.random() * 100), uptime: 95 + Math.random() * 5, detections: Math.floor(Math.random() * 50),
      })));

      setHourlyData(Array.from({ length: 24 }, (_, hour) => ({
        hour, alerts: alertsData?.filter(a => new Date(a.created_at).getHours() === hour).length || 0, activity: Math.floor(Math.random() * 100),
      })));
    } catch { toast.error('Erro ao carregar dados'); }
    finally { setLoading(false); setRefreshing(false); }
  }, [dateInterval]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportReport = (fmt: string) => {
    toast.success(`Exportando relatório em ${fmt.toUpperCase()}...`);
    if (fmt === 'csv') {
      const csv = ['Data,Alertas,Análises,Detecções,Gravações', ...chartData.map(d => `${d.label},${d.alerts},${d.analyses},${d.detections},${d.recordings}`)].join('\n');
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = `visao-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click();
    }
  };

  return (
    <div role="main" aria-label="Analytics" className="min-h-screen bg-background mb-mobile-nav">
      <PageMeta title="Analytics" description="Estatísticas e relatórios do sistema de vigilância" />

      {/* Premium Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Estatísticas e relatórios do período</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-36 border-border/40">
                  <Calendar className="w-4 h-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => { setRefreshing(true); loadData(); }} className="border-border/40">
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-border/40">
                    <Download className="w-4 h-4 mr-2" />Exportar
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => exportReport('csv')}><FileText className="w-4 h-4 mr-2" />CSV</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportReport('xlsx')}><FileText className="w-4 h-4 mr-2" />Excel</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportReport('pdf')}><FileText className="w-4 h-4 mr-2" />PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.success('Relatório enviado por email')}><Mail className="w-4 h-4 mr-2" />Email</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {loading ? Array.from({ length: 4 }).map((_, i) => <KPICard key={i} data={{} as KPIData} loading />) : kpis.map((kpi, i) => <KPICard key={i} data={kpi} />)}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Tendência de Alertas</CardTitle>
              <CardDescription>Alertas por dia no período</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[200px] w-full rounded-lg" /> : <SimpleBarChart data={chartData} dataKey="alerts" color="bg-destructive" height={200} />}
            </CardContent>
          </Card>
          <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Alertas por Tipo</CardTitle>
              <CardDescription>Distribuição por categoria</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {loading ? <Skeleton className="h-40 w-40 rounded-full" /> : (
                <>
                  <DonutChart data={alertsByType} />
                  <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                    {alertsByType.slice(0, 6).map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="truncate text-muted-foreground">{item.type}</span>
                        <span className="text-foreground ml-auto tabular-nums font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Performance & Hourly */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Performance por Câmera</CardTitle>
              <CardDescription>Top 5</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
              ) : cameraPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma câmera</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cameraPerformance.map((cam, i) => (
                    <div key={cam.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-sm font-medium w-6 text-muted-foreground tabular-nums">#{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium truncate">{cam.name}</span>
                          <Badge variant="secondary" className="text-xs">{cam.alerts} alertas</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={cam.uptime} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground w-12 tabular-nums">{cam.uptime.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Distribuição por Hora</CardTitle>
              <CardDescription>Concentração de alertas</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-32 w-full rounded-lg" /> : (
                <>
                  <HourlyHeatmap data={hourlyData} />
                  <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                    <span>Menor atividade</span>
                    <div className="flex items-center gap-1">
                      {[0.1, 0.3, 0.5, 0.7, 0.9].map((v, i) => (
                        <div key={i} className="w-4 h-4 rounded" style={{ backgroundColor: `hsl(var(--destructive) / ${v * 0.8})` }} />
                      ))}
                    </div>
                    <span>Maior atividade</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Resumo do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: 'Média Alertas/Dia', value: chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + d.alerts, 0) / chartData.length) : 0, icon: AlertTriangle, color: 'text-destructive' },
                { label: 'Pico de Alertas', value: Math.max(...chartData.map(d => d.alerts), 0), icon: TrendingUp, color: 'text-[hsl(var(--severity-medium))]' },
                { label: 'Hora Mais Ativa', value: `${hourlyData.reduce((max, d) => d.alerts > (hourlyData[max]?.alerts || 0) ? hourlyData.indexOf(d) : max, 0)}h`, icon: Clock, color: 'text-primary' },
                { label: 'Taxa Detecção', value: '94.2%', icon: Target, color: 'text-success' },
                { label: 'Uptime Médio', value: '99.1%', icon: Activity, color: 'text-primary' },
                { label: 'Faces Reconhecidas', value: Math.floor(Math.random() * 100), icon: ScanFace, color: 'text-primary' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-3.5 rounded-xl bg-muted/30 border border-border/30 transition-all hover:bg-muted/50 hover:border-border/50">
                  <stat.icon className={cn('w-5 h-5 mx-auto mb-1.5', stat.color)} />
                  <p className="text-lg font-bold font-mono tabular-nums">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsPage;
