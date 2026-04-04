/**
 * Gráficos do módulo de Eventos de Pânico
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line,
} from 'recharts';

interface PanicEvent {
  id: string;
  created_at: string;
  resolved: boolean;
  resolved_at?: string | null;
  user_name?: string | null;
}

export function PanicCharts({ events }: { events: PanicEvent[] }) {
  const statusData = useMemo(() => {
    const resolved = events.filter(e => e.resolved).length;
    return [
      { name: 'Resolvidos', value: resolved, fill: '#10b981' },
      { name: 'Pendentes', value: events.length - resolved, fill: 'hsl(var(--destructive))' },
    ];
  }, [events]);

  const dailyData = useMemo(() => {
    const days: Record<string, number> = {};
    events.forEach(e => {
      const d = new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days).slice(-14).map(([date, count]) => ({ date, count }));
  }, [events]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, count: 0 }));
    events.forEach(e => { hours[new Date(e.created_at).getHours()].count++; });
    return hours;
  }, [events]);

  const responseTime = useMemo(() => {
    const resolved = events.filter(e => e.resolved && e.resolved_at);
    if (resolved.length === 0) return [];
    return resolved.slice(-10).map(e => {
      const mins = Math.round((new Date(e.resolved_at!).getTime() - new Date(e.created_at).getTime()) / 60000);
      return {
        date: new Date(e.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        minutes: Math.min(mins, 120),
      };
    });
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status dos Eventos</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Eventos por Dia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Distribuição por Hora</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" interval={3} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {responseTime.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tempo de Resposta (min)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={responseTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
