import { useMemo, useState } from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval, eachHourOfInterval, subHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, BarChart3, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Alert {
  id: string;
  timestamp: string | Date;
  type: string;
  severity: string;
}

interface AlertTrendsChartProps {
  alerts: Alert[];
  className?: string;
}

type Period = '24h' | '7d' | '30d';
type ChartType = 'area' | 'bar';

const severityColors = {
  critical: 'hsl(var(--destructive))',
  high: 'hsl(0, 84%, 60%)',
  medium: 'hsl(38, 92%, 50%)',
  low: 'hsl(142, 71%, 45%)',
};

const typeColors = {
  security: 'hsl(0, 84%, 60%)',
  productivity: 'hsl(217, 91%, 60%)',
  safety: 'hsl(38, 92%, 50%)',
  intrusion: 'hsl(280, 84%, 60%)',
};

export function AlertTrendsChart({ alerts, className = '' }: AlertTrendsChartProps) {
  const [period, setPeriod] = useState<Period>('7d');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [groupBy, setGroupBy] = useState<'severity' | 'type'>('severity');

  const chartData = useMemo(() => {
    const now = new Date();
    let intervals: Date[];
    let formatStr: string;

    if (period === '24h') {
      intervals = eachHourOfInterval({
        start: subHours(now, 24),
        end: now,
      });
      formatStr = 'HH:mm';
    } else if (period === '7d') {
      intervals = eachDayOfInterval({
        start: subDays(now, 7),
        end: now,
      });
      formatStr = 'EEE';
    } else {
      intervals = eachDayOfInterval({
        start: subDays(now, 30),
        end: now,
      });
      formatStr = 'dd/MM';
    }

    return intervals.map((interval) => {
      const periodStart = startOfDay(interval);
      const periodEnd = period === '24h' 
        ? new Date(interval.getTime() + 60 * 60 * 1000)
        : new Date(periodStart.getTime() + 24 * 60 * 60 * 1000);

      const periodAlerts = alerts.filter((alert) => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= (period === '24h' ? interval : periodStart) && alertDate < periodEnd;
      });

      if (groupBy === 'severity') {
        return {
          name: format(interval, formatStr, { locale: ptBR }),
          critical: periodAlerts.filter((a) => a.severity === 'critical').length,
          high: periodAlerts.filter((a) => a.severity === 'high').length,
          medium: periodAlerts.filter((a) => a.severity === 'medium').length,
          low: periodAlerts.filter((a) => a.severity === 'low').length,
          total: periodAlerts.length,
        };
      } else {
        return {
          name: format(interval, formatStr, { locale: ptBR }),
          security: periodAlerts.filter((a) => a.type === 'security').length,
          productivity: periodAlerts.filter((a) => a.type === 'productivity').length,
          safety: periodAlerts.filter((a) => a.type === 'safety').length,
          intrusion: periodAlerts.filter((a) => a.type === 'intrusion').length,
          total: periodAlerts.length,
        };
      }
    });
  }, [alerts, period, groupBy]);

  const totalAlerts = useMemo(() => {
    return chartData.reduce((sum, d) => sum + d.total, 0);
  }, [chartData]);

  const colors = groupBy === 'severity' ? severityColors : typeColors;
  const keys = groupBy === 'severity' 
    ? ['critical', 'high', 'medium', 'low'] 
    : ['security', 'productivity', 'safety', 'intrusion'];

  const labels: Record<string, string> = {
    critical: 'Crítico',
    high: 'Alto',
    medium: 'Médio',
    low: 'Baixo',
    security: 'Segurança',
    productivity: 'Produtividade',
    safety: 'Segurança Trabalho',
    intrusion: 'Intrusão',
  };

  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Tendência de Alertas</h3>
          <span className="text-sm text-muted-foreground">({totalAlerts} no período)</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'severity' | 'type')}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="severity">Por Severidade</SelectItem>
              <SelectItem value="type">Por Tipo</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="24h" className="text-xs px-2">24h</TabsTrigger>
              <TabsTrigger value="7d" className="text-xs px-2">7 dias</TabsTrigger>
              <TabsTrigger value="30d" className="text-xs px-2">30 dias</TabsTrigger>
            </TabsList>
          </Tabs>

          <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
            <TabsList className="h-8">
              <TabsTrigger value="area" className="px-2">
                <TrendingUp className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="bar" className="px-2">
                <BarChart3 className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {keys.map((key) => (
                  <linearGradient key={key} id={`gradient-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={colors[key as keyof typeof colors]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={colors[key as keyof typeof colors]} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                formatter={(value) => labels[value] || value}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {keys.map((key) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={key}
                  stackId="1"
                  stroke={colors[key as keyof typeof colors]}
                  fill={`url(#gradient-${key})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend 
                formatter={(value) => labels[value] || value}
                wrapperStyle={{ fontSize: '11px' }}
              />
              {keys.map((key) => (
                <Bar
                  key={key}
                  dataKey={key}
                  name={key}
                  stackId="1"
                  fill={colors[key as keyof typeof colors]}
                  radius={[2, 2, 0, 0]}
                />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
