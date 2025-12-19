import { useMemo } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Shield, Clock, 
  Activity, Users, Camera, Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAlerts, DbAlert } from '@/hooks/useAlerts';
import { useCameras } from '@/hooks/useCameras';
import { Skeleton } from '@/components/ui/skeleton';
import { format, subDays, startOfDay, eachDayOfInterval, eachHourOfInterval, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = {
  primary: 'hsl(168, 84%, 44%)',
  destructive: 'hsl(0, 72%, 51%)',
  warning: 'hsl(38, 92%, 50%)',
  success: 'hsl(142, 76%, 36%)',
  muted: 'hsl(215, 20%, 55%)',
  secondary: 'hsl(222, 30%, 24%)',
};

const SEVERITY_COLORS: Record<string, string> = {
  low: COLORS.muted,
  medium: COLORS.warning,
  high: '#f97316',
  critical: COLORS.destructive,
};

const TYPE_COLORS: Record<string, string> = {
  security: COLORS.destructive,
  safety: COLORS.warning,
  operations: COLORS.primary,
  access: '#8b5cf6',
  analytics: '#06b6d4',
};

export function AnalyticsDashboard() {
  const { alerts, loading: alertsLoading } = useAlerts();
  const { cameras, loading: camerasLoading } = useCameras();

  const loading = alertsLoading || camerasLoading;

  // Process alerts for charts
  const alertsByDay = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date(),
    });

    return last7Days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const dayAlerts = alerts.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= dayStart && alertDate <= dayEnd;
      });

      return {
        date: format(day, 'EEE', { locale: ptBR }),
        fullDate: format(day, 'dd/MM'),
        total: dayAlerts.length,
        critical: dayAlerts.filter(a => a.severity === 'critical').length,
        high: dayAlerts.filter(a => a.severity === 'high').length,
        medium: dayAlerts.filter(a => a.severity === 'medium').length,
        low: dayAlerts.filter(a => a.severity === 'low').length,
      };
    });
  }, [alerts]);

  const alertsByHour = useMemo(() => {
    const last24Hours = eachHourOfInterval({
      start: subHours(new Date(), 23),
      end: new Date(),
    });

    return last24Hours.map(hour => {
      const hourStart = new Date(hour);
      const hourEnd = new Date(hour);
      hourEnd.setMinutes(59, 59, 999);

      const hourAlerts = alerts.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= hourStart && alertDate <= hourEnd;
      });

      return {
        hour: format(hour, 'HH:mm'),
        total: hourAlerts.length,
      };
    });
  }, [alerts]);

  const alertsByType = useMemo(() => {
    const typeLabels: Record<string, string> = {
      security: 'Segurança',
      safety: 'EPI',
      operations: 'Operações',
      access: 'Acesso',
      analytics: 'Analytics',
    };

    const typeCounts = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts).map(([type, count]) => ({
      name: typeLabels[type] || type,
      value: count,
      color: TYPE_COLORS[type] || COLORS.muted,
    }));
  }, [alerts]);

  const alertsBySeverity = useMemo(() => {
    const severityLabels: Record<string, string> = {
      low: 'Baixo',
      medium: 'Médio',
      high: 'Alto',
      critical: 'Crítico',
    };

    const severityCounts = alerts.reduce((acc, alert) => {
      acc[alert.severity] = (acc[alert.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(severityCounts).map(([severity, count]) => ({
      name: severityLabels[severity] || severity,
      value: count,
      color: SEVERITY_COLORS[severity] || COLORS.muted,
    }));
  }, [alerts]);

  const cameraStats = useMemo(() => {
    const statusCounts = cameras.reduce((acc, cam) => {
      acc[cam.status] = (acc[cam.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return [
      { name: 'Online', value: statusCounts.online || 0, color: COLORS.success },
      { name: 'Alerta', value: statusCounts.alert || 0, color: COLORS.destructive },
      { name: 'Aviso', value: statusCounts.warning || 0, color: COLORS.warning },
      { name: 'Offline', value: statusCounts.offline || 0, color: COLORS.muted },
    ].filter(item => item.value > 0);
  }, [cameras]);

  const stats = useMemo(() => {
    const totalAlerts = alerts.length;
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const unreadAlerts = alerts.filter(a => !a.is_read).length;
    const onlineCameras = cameras.filter(c => c.status !== 'offline').length;
    const totalPeople = cameras.reduce((sum, c) => sum + (c.detected_people || 0), 0);

    return { totalAlerts, criticalAlerts, unreadAlerts, onlineCameras, totalPeople };
  }, [alerts, cameras]);

  if (loading) {
    return (
      <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Alertas</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalAlerts}</p>
                <p className="text-xs text-muted-foreground mt-1">{stats.unreadAlerts} não lidos</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <AlertTriangle className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Alertas Críticos</p>
                <p className="text-3xl font-bold text-destructive">{stats.criticalAlerts}</p>
                <p className="text-xs text-muted-foreground mt-1">Requerem atenção</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <Shield className="w-6 h-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Câmeras Ativas</p>
                <p className="text-3xl font-bold text-foreground">{stats.onlineCameras}/{cameras.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Monitorando</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Camera className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pessoas Detectadas</p>
                <p className="text-3xl font-bold text-foreground">{stats.totalPeople}</p>
                <p className="text-xs text-muted-foreground mt-1">Em tempo real</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in-delay-1">
        {/* Alerts by Day */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Alertas por Dia (Últimos 7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertsByDay}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(215, 20%, 55%)" 
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis 
                    stroke="hsl(215, 20%, 55%)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(222, 47%, 10%)', 
                      border: '1px solid hsl(222, 30%, 20%)',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(_, payload) => payload[0]?.payload?.fullDate || ''}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={COLORS.primary} 
                    fillOpacity={1} 
                    fill="url(#colorTotal)"
                    name="Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts by Severity */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Alertas por Severidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={alertsByDay} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                  <YAxis dataKey="date" type="category" stroke="hsl(215, 20%, 55%)" fontSize={12} width={40} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(222, 47%, 10%)', 
                      border: '1px solid hsl(222, 30%, 20%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="critical" name="Crítico" fill={SEVERITY_COLORS.critical} stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="high" name="Alto" fill={SEVERITY_COLORS.high} stackId="a" />
                  <Bar dataKey="medium" name="Médio" fill={SEVERITY_COLORS.medium} stackId="a" />
                  <Bar dataKey="low" name="Baixo" fill={SEVERITY_COLORS.low} stackId="a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Activity Last 24h */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Atividade (Últimas 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={alertsByHour}>
                  <defs>
                    <linearGradient id="colorHour" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.warning} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS.warning} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 20%)" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="hsl(215, 20%, 55%)" 
                    fontSize={10}
                    tickLine={false}
                    interval={3}
                  />
                  <YAxis 
                    stroke="hsl(215, 20%, 55%)" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(222, 47%, 10%)', 
                      border: '1px solid hsl(222, 30%, 20%)',
                      borderRadius: '8px',
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={COLORS.warning} 
                    fillOpacity={1} 
                    fill="url(#colorHour)"
                    name="Alertas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Charts */}
        <Card className="glass-card border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex gap-4">
              {/* Alerts by Type */}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground text-center mb-2">Por Tipo</p>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={alertsByType}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {alertsByType.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(222, 47%, 10%)', 
                        border: '1px solid hsl(222, 30%, 20%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Cameras Status */}
              <div className="flex-1">
                <p className="text-xs text-muted-foreground text-center mb-2">Câmeras</p>
                <ResponsiveContainer width="100%" height="90%">
                  <PieChart>
                    <Pie
                      data={cameraStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {cameraStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(222, 47%, 10%)', 
                        border: '1px solid hsl(222, 30%, 20%)',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36}
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
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
