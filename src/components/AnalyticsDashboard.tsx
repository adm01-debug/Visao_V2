import { formatDate, formatNumber } from "@/lib/formatters";
import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, Clock, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlerts } from '@/hooks/useAlerts';
import { useCameras } from '@/hooks/useCameras';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, eachDayOfInterval, eachHourOfInterval, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ANALYTICS_COLORS, SEVERITY_COLORS, TYPE_COLORS, TYPE_LABELS, SEVERITY_LABELS, TOOLTIP_STYLE } from './analytics/analyticsConstants';
import { AnalyticsStatsCards } from './analytics/AnalyticsStatsCards';

export function AnalyticsDashboard() {
  const { alerts, loading: alertsLoading } = useAlerts();
  const { cameras, loading: camerasLoading } = useCameras();
  const loading = alertsLoading || camerasLoading;

  const alertsByDay = useMemo(() => {
    const last7Days = eachDayOfInterval({ start: subDays(new Date(), 6), end: new Date() });
    return last7Days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayAlerts = alerts.filter(a => { const d = new Date(a.timestamp); return d >= dayStart && d <= dayEnd; });
      return {
        date: format(day, 'EEE', { locale: ptBR }), fullDate: format(day, 'dd/MM'),
        total: dayAlerts.length,
        critical: dayAlerts.filter(a => a.severity === 'critical').length,
        high: dayAlerts.filter(a => a.severity === 'high').length,
        medium: dayAlerts.filter(a => a.severity === 'medium').length,
        low: dayAlerts.filter(a => a.severity === 'low').length,
      };
    });
  }, [alerts]);

  const alertsByHour = useMemo(() => {
    const last24Hours = eachHourOfInterval({ start: subHours(new Date(), 23), end: new Date() });
    return last24Hours.map(hour => {
      const hourEnd = new Date(hour); hourEnd.setMinutes(59, 59, 999);
      return { hour: format(hour, 'HH:mm'), total: alerts.filter(a => { const d = new Date(a.timestamp); return d >= hour && d <= hourEnd; }).length };
    });
  }, [alerts]);

  const alertsByType = useMemo(() => {
    const counts = alerts.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {} as Record<string, number>);
    return Object.entries(counts).map(([type, value]) => ({ name: TYPE_LABELS[type] || type, value, color: TYPE_COLORS[type] || ANALYTICS_COLORS.muted }));
  }, [alerts]);

  const cameraStats = useMemo(() => {
    const counts = cameras.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {} as Record<string, number>);
    return [
      { name: 'Online', value: counts.online || 0, color: ANALYTICS_COLORS.success },
      { name: 'Alerta', value: counts.alert || 0, color: ANALYTICS_COLORS.destructive },
      { name: 'Aviso', value: counts.warning || 0, color: ANALYTICS_COLORS.warning },
      { name: 'Offline', value: counts.offline || 0, color: ANALYTICS_COLORS.muted },
    ].filter(i => i.value > 0);
  }, [cameras]);

  const stats = useMemo(() => ({
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
    unreadAlerts: alerts.filter(a => !a.is_read).length,
    onlineCameras: cameras.filter(c => c.status !== 'offline').length,
    totalPeople: cameras.reduce((s, c) => s + (c.detected_people || 0), 0),
  }), [alerts, cameras]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
      <AnalyticsStatsCards {...stats} totalCameras={cameras.length} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-delay-1">
        {/* Alerts by Day */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary" />Alertas por Dia (Últimos 7 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertsByDay}>
                  <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ANALYTICS_COLORS.primary} stopOpacity={0.3}/><stop offset="95%" stopColor={ANALYTICS_COLORS.primary} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis dataKey="date" stroke={ANALYTICS_COLORS.muted} fontSize={12} tickLine={false} />
                  <YAxis stroke={ANALYTICS_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} labelFormatter={(_, p) => p[0]?.payload?.fullDate || ''} />
                  <Area type="monotone" dataKey="total" stroke={ANALYTICS_COLORS.primary} fillOpacity={1} fill="url(#colorTotal)" name="Total" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts by Severity */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" />Alertas por Severidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertsByDay} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis type="number" stroke={ANALYTICS_COLORS.muted} fontSize={12} />
                  <YAxis dataKey="date" type="category" stroke={ANALYTICS_COLORS.muted} fontSize={12} width={40} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Legend />
                  <Bar dataKey="critical" name="Crítico" fill={SEVERITY_COLORS.critical} stackId="a" />
                  <Bar dataKey="high" name="Alto" fill={SEVERITY_COLORS.high} stackId="a" />
                  <Bar dataKey="medium" name="Médio" fill={SEVERITY_COLORS.medium} stackId="a" />
                  <Bar dataKey="low" name="Baixo" fill={SEVERITY_COLORS.low} stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity 24h */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-primary" />Atividade (Últimas 24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertsByHour}>
                  <defs><linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={ANALYTICS_COLORS.warning} stopOpacity={0.3}/><stop offset="95%" stopColor={ANALYTICS_COLORS.warning} stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis dataKey="hour" stroke={ANALYTICS_COLORS.muted} fontSize={10} tickLine={false} interval={3} />
                  <YAxis stroke={ANALYTICS_COLORS.muted} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} />
                  <Area type="monotone" dataKey="total" stroke={ANALYTICS_COLORS.warning} fillOpacity={1} fill="url(#colorHour)" name="Alertas" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><Activity className="w-5 h-5 text-primary" />Distribuição</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground text-center mb-2">Por Tipo</p>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={alertsByType} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      {alertsByType.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground text-center mb-2">Câmeras</p>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie data={cameraStats} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                      {cameraStats.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Legend verticalAlign="bottom" height={36} formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
