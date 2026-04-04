/**
 * Gráficos do módulo de Alertas
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from 'recharts';
import { Tables } from '@/integrations/supabase/types';

type Alert = Tables<'alerts'>;

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'hsl(var(--destructive))',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const TYPE_COLORS = ['hsl(var(--primary))', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981'];

export function AlertsCharts({ alerts }: { alerts: Alert[] }) {
  const severityData = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    alerts.forEach(a => { counts[a.severity] = (counts[a.severity] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value, fill: SEVERITY_COLORS[name] || '#888' }));
  }, [alerts]);

  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    alerts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, count: 0 }));
    alerts.forEach(a => {
      const h = new Date(a.timestamp).getHours();
      hours[h].count++;
    });
    return hours;
  }, [alerts]);

  const dailyTrend = useMemo(() => {
    const days: Record<string, { date: string; critical: number; high: number; medium: number; low: number }> = {};
    const sorted = [...alerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    sorted.forEach(a => {
      const d = new Date(a.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[d]) days[d] = { date: d, critical: 0, high: 0, medium: 0, low: 0 };
      days[d][a.severity as keyof Omit<typeof days[string], 'date'>]++;
    });
    return Object.values(days).slice(-14);
  }, [alerts]);

  if (alerts.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Distribuição por Severidade</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {severityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alertas por Tipo</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={typeData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="name" type="category" width={100} className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Atividade por Hora do Dia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" interval={3} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Area type="monotone" dataKey="count" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tendência Diária (14 dias)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="critical" stackId="a" fill={SEVERITY_COLORS.critical} name="Crítico" />
              <Bar dataKey="high" stackId="a" fill={SEVERITY_COLORS.high} name="Alto" />
              <Bar dataKey="medium" stackId="a" fill={SEVERITY_COLORS.medium} name="Médio" />
              <Bar dataKey="low" stackId="a" fill={SEVERITY_COLORS.low} name="Baixo" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
