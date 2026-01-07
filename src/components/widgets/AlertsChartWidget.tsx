import React from 'react';
import { useAlerts } from '@/hooks/useAlerts';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function AlertsChartWidget() {
  const { alerts, loading } = useAlerts();

  const chartData = React.useMemo(() => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 6);
    
    const days = eachDayOfInterval({ start: sevenDaysAgo, end: today });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayAlerts = alerts?.filter(alert => {
        const alertDate = new Date(alert.timestamp);
        return alertDate >= dayStart && alertDate <= dayEnd;
      }) || [];

      return {
        date: format(day, 'EEE', { locale: ptBR }),
        fullDate: format(day, 'dd/MM', { locale: ptBR }),
        total: dayAlerts.length,
        critical: dayAlerts.filter(a => a.severity === 'critical').length,
        high: dayAlerts.filter(a => a.severity === 'high').length,
      };
    });
  }, [alerts]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse bg-muted rounded w-full h-24" />
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return payload[0].payload.fullDate;
              }
              return label;
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            name="Total"
            stroke="hsl(var(--primary))"
            fill="url(#colorTotal)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="critical"
            name="Críticos"
            stroke="hsl(var(--destructive))"
            fill="url(#colorCritical)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
