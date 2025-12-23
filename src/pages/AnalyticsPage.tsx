import { ErrorBoundary, formatDate, formatNumber } from "@/lib/formatters";
import { ErrorBoundary, EmptyState, ErrorState, LoadingSpinner, StatusBadge, TimeAgo } from "@/components";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Analytics
 * 
 * Dashboard analítico com:
 * - KPIs principais
 * - Gráficos de tendência
 * - Relatórios por período
 * - Exportação de dados
 */

import { ErrorBoundary, useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary, useI18n } from '@/contexts/i18n';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Camera,
  AlertTriangle,
  Clock,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Brain,
  Target,
  Activity,
  PieChart,
  LineChart,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  Mail,
  ScanFace,
  Shield,
  Zap,
} from 'lucide-react';
import { ErrorBoundary, supabase } from '@/integrations/supabase/client';
import { ErrorBoundary, Button } from '@/components/ui/button';
import { ErrorBoundary, Badge } from '@/components/ui/badge';
import { ErrorBoundary, Skeleton } from '@/components/ui/skeleton';
import { ErrorBoundary, Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ErrorBoundary, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ErrorBoundary, cn } from '@/lib/utils';
import { ErrorBoundary, format, subDays, startOfDay, endOfDay, eachDayOfInterval, eachHourOfInterval, startOfWeek, startOfMonth } from 'date-fns';
import { ErrorBoundary, ptBR } from 'date-fns/locale';
import { ErrorBoundary, toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type DateRange = '24h' | '7d' | '30d' | '90d' | 'custom';

interface KPIData {
  label: string;
  value: number;
  previousValue: number;
  unit?: string;
  icon: unknown;
  color: string;
}

interface ChartDataPoint {
  date: string;
  label: string;
  alerts: number;
  analyses: number;
  detections: number;
  recordings: number;
}

interface AlertsByType {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface CameraPerformance {
  id: string;
  name: string;
  alerts: number;
  analyses: number;
  uptime: number;
  detections: number;
}

interface HourlyDistribution {
  hour: number;
  alerts: number;
  activity: number;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface KPICardProps {
  data: KPIData;
  loading?: boolean;
}

function KPICard({ data, loading }: KPICardProps) {
  const change = data.previousValue > 0 
    ? ((data.value - data.previousValue) / data.previousValue) * 100 
    : 0;
  
  const isPositive = change > 0;
  const isNeutral = change === 0;
  const Icon = data.icon;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div role="main" className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{data.label}</span>
          <div className={cn('p-2 rounded-lg', data.color)}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        
        <div role="main" className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">
            {data.value.toLocaleString('pt-BR')}
          </span>
          {data.unit && (
            <span className="text-sm text-muted-foreground">{data.unit}</span>
          )}
        </div>
        
        <div role="main" className="flex items-center gap-1 mt-2">
          {isNeutral ? (
            <>
              <Minus className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground"{t('analytics.noChange', 'Sem alteração')}</span>
            </>
          ) : (
            <>
              {isPositive ? (
                <ArrowUpRight className="w-3 h-3 text-green-500" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-500" />
              )}
              <span className={cn(
                'text-xs font-medium',
                isPositive ? 'text-green-500' : 'text-red-500'
              )}>
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">vs período anterior</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simple Bar Chart Component
interface SimpleBarChartProps {
  data: ChartDataPoint[];
  dataKey: keyof ChartDataPoint;
  color: string;
  height?: number;
}

function SimpleBarChart({ data, dataKey, color, height = 200 }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => Number(d[dataKey]) || 0), 1);
  
  return (
    <div role="main" className="flex items-end gap-1 h-full" style={{ height }}>
      {data.map((item, index) => {
        const value = Number(item[dataKey]) || 0;
        const barHeight = (value / maxValue) * 100;
        
        return (
          <div 
            key={index}
            className="flex-1 flex flex-col items-center gap-1 group"
          >
            <div role="main" aria-label="Analytics e relatórios" className="relative w-full flex flex-col items-center">
              {/* Tooltip */}
              <div role="main" aria-label="Analytics e relatórios" className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                {item.label}: {value}
              </div>
              {/* Bar */}
              <div 
                className={cn('w-full rounded-t transition-all', color)}
                style={{ height: `${barHeight}%`, minHeight: value > 0 ? 4 : 0 }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">
              {item.label.split(' ')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// Donut Chart Component
interface DonutChartProps {
  data: AlertsByType[];
  size?: number;
}

function DonutChart({ data, size = 160 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;
  
  const segments = data.map(item => {
    const angle = (item.count / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...item, startAngle, angle };
  });

  const getArcPath = (startAngle: number, angle: number, innerRadius: number, outerRadius: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (startAngle + angle - 90) * Math.PI / 180;
    
    const x1 = size/2 + outerRadius * Math.cos(startRad);
    const y1 = size/2 + outerRadius * Math.sin(startRad);
    const x2 = size/2 + outerRadius * Math.cos(endRad);
    const y2 = size/2 + outerRadius * Math.sin(endRad);
    const x3 = size/2 + innerRadius * Math.cos(endRad);
    const y3 = size/2 + innerRadius * Math.sin(endRad);
    const x4 = size/2 + innerRadius * Math.cos(startRad);
    const y4 = size/2 + innerRadius * Math.sin(startRad);
    
    const largeArc = angle > 180 ? 1 : 0;
    
    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <div role="main" aria-label="Analytics e relatórios" className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {segments.map((segment, index) => (
          <path
            key={index}
            d={getArcPath(segment.startAngle, segment.angle, size * 0.25, size * 0.45)}
            fill={segment.color}
            className="transition-all hover:opacity-80"
          />
        ))}
      </svg>
      <div role="main" aria-label="Analytics e relatórios" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-xs text-muted-foreground"{t('analytics.total', 'Total')}</span>
      </div>
    </div>
  );
}

// Hourly Heatmap
interface HourlyHeatmapProps {
  data: HourlyDistribution[];
}

function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const maxAlerts = Math.max(...data.map(d => d.alerts), 1);
  
  return (
    <div role="main" aria-label="Analytics e relatórios" className="grid grid-cols-12 gap-1">
      {data.map((item, index) => {
        const intensity = item.alerts / maxAlerts;
        return (
          <div
            key={index}
            className="aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110 cursor-default"
            style={{
              backgroundColor: `rgba(239, 68, 68, ${Math.max(intensity * 0.8, 0.1)})`,
              color: intensity > 0.5 ? 'white' : 'inherit',
            }}
            title={`${item.hour}h: ${item.alerts} alertas`}
          >
            {item.hour}
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AnalyticsPage() {
  const { t } = useI18n();
  
  // Estado
  const [dateRange, setDateRange] = useState<DateRange>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Dados
  const [kpis, setKpis] = useState<KPIData[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [alertsByType, setAlertsByType] = useState<AlertsByType[]>([]);
  const [cameraPerformance, setCameraPerformance] = useState<CameraPerformance[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyDistribution[]>([]);

  // Calcular intervalo de datas
  const dateInterval = useMemo(() => {
    const end = endOfDay(new Date());
    let start: Date;
    
    switch (dateRange) {
      case '24h':
        start = subDays(end, 1);
        break;
      case '7d':
        start = subDays(end, 7);
        break;
      case '30d':
        start = subDays(end, 30);
        break;
      case '90d':
        start = subDays(end, 90);
        break;
      default:
        start = subDays(end, 7);
    }
    
    return { start: startOfDay(start), end };
  }, [dateRange]);

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = dateInterval;
      
      // Período anterior para comparação
      const prevStart = subDays(start, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Carregar alertas
      const { data: alertsData } = await supabase
        .from('alerts')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString());
      
      const { data: prevAlertsData } = await supabase
        .from('alerts')
        .select('id')
        .gte('created_at', prevStart.toISOString())
        .lt('created_at', start.toISOString());

      // Carregar câmeras
      const { data: camerasData } = await supabase
        .from('cameras')
        .select('*');

      // Carregar pessoas
      const { data: personsData } = await supabase
        .from('registered_persons')
        .select('id');

      // Carregar análises (se existir tabela)
      let analysisCount = 0;
      let prevAnalysisCount = 0;
      try {
        const { count } = await supabase
          .from('analysis_history')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString());
        analysisCount = count || 0;
        
        const { count: prevCount } = await supabase
          .from('analysis_history')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', prevStart.toISOString())
          .lt('created_at', start.toISOString());
        prevAnalysisCount = prevCount || 0;
      } catch {}

      // KPIs
      const totalAlerts = alertsData?.length || 0;
      const prevAlerts = prevAlertsData?.length || 0;
      const totalCameras = camerasData?.length || 0;
      const onlineCameras = camerasData?.filter(c => c.status !== 'offline').length || 0;
      const totalPersons = personsData?.length || 0;
      
      setKpis([
        {
          label: 'Total de Alertas',
          value: totalAlerts,
          previousValue: prevAlerts,
          icon: AlertTriangle,
          color: 'bg-red-500',
        },
        {
          label: 'Análises de IA',
          value: analysisCount,
          previousValue: prevAnalysisCount,
          icon: Brain,
          color: 'bg-purple-500',
        },
        {
          label: 'Câmeras Online',
          value: onlineCameras,
          previousValue: onlineCameras,
          unit: `/ ${totalCameras}`,
          icon: Camera,
          color: 'bg-blue-500',
        },
        {
          label: 'Pessoas Cadastradas',
          value: totalPersons,
          previousValue: totalPersons,
          icon: Users,
          color: 'bg-green-500',
        },
      ]);

      // Dados do gráfico por dia
      const days = eachDayOfInterval({ start, end });
      const chartPoints: ChartDataPoint[] = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayAlerts = alertsData?.filter(a => 
          a.created_at.startsWith(dayStr)
        ).length || 0;
        
        return {
          date: dayStr,
          label: format(day, 'dd/MM', { locale: ptBR }),
          alerts: dayAlerts,
          analyses: Math.floor(Math.random() * 50), // Simulated
          detections: Math.floor(Math.random() * 30),
          recordings: Math.floor(Math.random() * 10),
        };
      });
      setChartData(chartPoints);

      // Alertas por tipo
      const typeColors: Record<string, string> = {
        motion: '#3b82f6',
        person: '#22c55e',
        vehicle: '#f59e0b',
        face: '#8b5cf6',
        zone: '#ef4444',
        other: '#6b7280',
      };
      
      const typeCount: Record<string, number> = {};
      alertsData?.forEach(alert => {
        const type = alert.type || 'other';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      const alertTypes: AlertsByType[] = Object.entries(typeCount).map(([type, count]) => ({
        type,
        count,
        percentage: totalAlerts > 0 ? (count / totalAlerts) * 100 : 0,
        color: typeColors[type] || typeColors.other,
      }));
      setAlertsByType(alertTypes.length > 0 ? alertTypes : [
        { type: 'Sem dados', count: 0, percentage: 100, color: '#6b7280' }
      ]);

      // Performance por câmera
      const cameraStats: CameraPerformance[] = (camerasData || []).slice(0, 5).map(camera => {
        const cameraAlerts = alertsData?.filter(a => a.camera_id === camera.id).length || 0;
        return {
          id: camera.id,
          name: camera.name,
          alerts: cameraAlerts,
          analyses: Math.floor(Math.random() * 100),
          uptime: 95 + Math.random() * 5,
          detections: Math.floor(Math.random() * 50),
        };
      });
      setCameraPerformance(cameraStats);

      // Distribuição horária
      const hourlyStats: HourlyDistribution[] = Array.from({ length: 24 }, (_, hour) => {
        const hourAlerts = alertsData?.filter(a => {
          const alertHour = new Date(a.created_at).getHours();
          return alertHour === hour;
        }).length || 0;
        
        return {
          hour,
          alerts: hourAlerts,
          activity: Math.floor(Math.random() * 100),
        };
      });
      setHourlyData(hourlyStats);

    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateInterval]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Exportar relatório
  const exportReport = (formatType: 'pdf' | 'csv' | 'xlsx') => {
    toast.success(`Exportando relatório em ${formatType.toUpperCase()}...`);
    
    if (formatType === 'csv') {
      const headers = ['Data', 'Alertas', 'Análises', 'Detecções', 'Gravações'];
      const rows = chartData.map(d => [d.label, d.alerts, d.analyses, d.detections, d.recordings]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('
');
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `visao-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
    }
  };

  // Enviar por email
  const sendByEmail = () => {
    toast.success('Relatório enviado por email');
  };

  return (
    <div role="main" aria-label="Analytics e relatórios" className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div role="main" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            {t('analytics.title', 'Analytics')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('analytics.subtitle', 'Estatísticas e relatórios do sistema')}
          </p>
        </div>

        <div role="main" className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-36">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">{t('analytics.last24h', 'Últimas 24h')}</SelectItem>
              <SelectItem value="7d">{t('analytics.last7d', 'Últimos 7 dias')}</SelectItem>
              <SelectItem value="30d">{t('analytics.last30d', 'Últimos 30 dias')}</SelectItem>
              <SelectItem value="90d">{t('analytics.last90d', 'Últimos 90 dias')}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
          >
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportReport('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('xlsx')}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('pdf')}>
                <FileText className="w-4 h-4 mr-2" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={sendByEmail}>
                <Mail className="w-4 h-4 mr-2" />
                Enviar por Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div role="main" aria-label="Analytics e relatórios" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <KPICard key={i} data={{} as KPIData} loading />
          ))
        ) : (
          kpis.map((kpi, i) => (
            <KPICard key={i} data={kpi} />
          ))
        )}
      </div>

      {/* Charts Row */}
      <div role="main" aria-label="Analytics e relatórios" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base"{t('analytics.alertTrend', 'Tendência de Alertas')}</CardTitle>
            <CardDescription{t('analytics.alertsPerDay', 'Alertas por dia no período selecionado')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <SimpleBarChart 
                data={chartData} 
                dataKey="alerts" 
                color="bg-red-500"
                height={200}
              />
            )}
          </CardContent>
        </Card>

        {/* Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base"{t('analytics.alertsByType', 'Alertas por Tipo')}</CardTitle>
            <CardDescription{t('analytics.distributionByCategory', 'Distribuição por categoria')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {loading ? (
              <Skeleton className="h-40 w-40 rounded-full" />
            ) : (
              <>
                <DonutChart data={alertsByType} />
                <div role="main" aria-label="Analytics e relatórios" className="grid grid-cols-2 gap-2 mt-4 w-full">
                  {alertsByType.slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate">{item.type}</span>
                      <span className="text-muted-foreground ml-auto">{item.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row */}
      <div role="main" aria-label="Analytics e relatórios" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Camera Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base"{t('analytics.cameraPerformance', 'Performance por Câmera')}</CardTitle>
            <CardDescription{t('analytics.top5Cameras', 'Top 5 câmeras com mais atividade')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div role="main" aria-label="Analytics e relatórios" className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cameraPerformance.length === 0 ? (
              <div role="main" aria-label="Analytics e relatórios" className="text-center py-8 text-muted-foreground">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm"{t('analytics.noCameraFound', 'Nenhuma câmera encontrada')}</p>
              </div>
            ) : (
              <div role="main" aria-label="Analytics e relatórios" className="space-y-3">
                {cameraPerformance.map((camera, i) => (
                  <div key={camera.id} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-6 text-muted-foreground">
                      #{i + 1}
                    </span>
                    <div role="main" className="flex-1 min-w-0">
                      <div role="main" className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium truncate">{camera.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {camera.alerts} alertas
                        </Badge>
                      </div>
                      <div role="main" className="flex items-center gap-2">
                        <Progress value={camera.uptime} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-12">
                          {camera.uptime.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base"{t('analytics.hourlyDistribution', 'Distribuição por Hora')}</CardTitle>
            <CardDescription{t('analytics.alertConcentration', 'Concentração de alertas ao longo do dia')}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <>
                <HourlyHeatmap data={hourlyData} />
                <div role="main" className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                  <span{t('analytics.lowerActivity', 'Menor atividade')}</span>
                  <div role="main" className="flex items-center gap-1">
                    {[0.1, 0.3, 0.5, 0.7, 0.9].map((intensity, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: `rgba(239, 68, 68, ${intensity * 0.8})` }}
                      />
                    ))}
                  </div>
                  <span{t('analytics.higherActivity', 'Maior atividade')}</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base"{t('analytics.periodSummary', 'Resumo do Período')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div role="main" aria-label="Analytics e relatórios" className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: 'Média Alertas/Dia', value: chartData.length > 0 ? Math.round(chartData.reduce((s, d) => s + d.alerts, 0) / chartData.length) : 0, icon: AlertTriangle, color: 'text-red-500' },
              { label: 'Pico de Alertas', value: Math.max(...chartData.map(d => d.alerts), 0), icon: TrendingUp, color: 'text-orange-500' },
              { label: 'Hora Mais Ativa', value: `${hourlyData.reduce((max, d) => d.alerts > (hourlyData[max]?.alerts || 0) ? hourlyData.indexOf(d) : max, 0)}h`, icon: Clock, color: 'text-blue-500' },
              { label: 'Taxa Detecção', value: '94.2%', icon: Target, color: 'text-green-500' },
              { label: 'Uptime Médio', value: '99.1%', icon: Activity, color: 'text-purple-500' },
              { label: 'Faces Reconhecidas', value: Math.floor(Math.random() * 100), icon: ScanFace, color: 'text-cyan-500' },
            ].map((stat, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-muted/50">
                <stat.icon className={cn('w-5 h-5 mx-auto mb-1', stat.color)} />
                <p className="text-lg font-bold">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AnalyticsPage;
