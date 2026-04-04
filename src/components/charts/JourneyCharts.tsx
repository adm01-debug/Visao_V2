/**
 * Gráficos do módulo de Relatórios de Jornada
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, RadialBarChart, RadialBar,
} from 'recharts';

interface JourneyEntry {
  personName: string;
  totalMinutes: number;
  productiveMinutes: number;
  idleMinutes: number;
  punctuality: 'on_time' | 'late' | 'very_late' | 'absent';
  department?: string | null;
}

const PUNCTUALITY_COLORS: Record<string, string> = {
  on_time: '#10b981',
  late: '#eab308',
  very_late: '#f97316',
  absent: 'hsl(var(--destructive))',
};

const PUNCTUALITY_LABELS: Record<string, string> = {
  on_time: 'No horário',
  late: 'Atrasado',
  very_late: 'Muito atrasado',
  absent: 'Ausente',
};

export function JourneyCharts({ entries }: { entries: JourneyEntry[] }) {
  const punctualityData = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => { counts[e.punctuality] = (counts[e.punctuality] || 0) + 1; });
    return Object.entries(counts).map(([key, value]) => ({
      name: PUNCTUALITY_LABELS[key] || key,
      value,
      fill: PUNCTUALITY_COLORS[key] || '#888',
    }));
  }, [entries]);

  const productivityByPerson = useMemo(() => {
    return entries
      .sort((a, b) => b.productiveMinutes - a.productiveMinutes)
      .slice(0, 8)
      .map(e => ({
        name: e.personName.split(' ')[0]?.slice(0, 10) || 'N/A',
        produtivo: Math.round(e.productiveMinutes / 60 * 10) / 10,
        ocioso: Math.round(e.idleMinutes / 60 * 10) / 10,
      }));
  }, [entries]);

  const departmentData = useMemo(() => {
    const depts: Record<string, { productive: number; total: number; count: number }> = {};
    entries.forEach(e => {
      const dept = e.department || 'Sem depto';
      if (!depts[dept]) depts[dept] = { productive: 0, total: 0, count: 0 };
      depts[dept].productive += e.productiveMinutes;
      depts[dept].total += e.totalMinutes;
      depts[dept].count++;
    });
    return Object.entries(depts).map(([name, d]) => ({
      name: name.slice(0, 15),
      efficiency: d.total > 0 ? Math.round((d.productive / d.total) * 100) : 0,
    }));
  }, [entries]);

  const avgEfficiency = useMemo(() => {
    if (entries.length === 0) return 0;
    const totalProd = entries.reduce((s, e) => s + e.productiveMinutes, 0);
    const totalAll = entries.reduce((s, e) => s + e.totalMinutes, 0);
    return totalAll > 0 ? Math.round((totalProd / totalAll) * 100) : 0;
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Eficiência Geral</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: avgEfficiency, fill: avgEfficiency >= 80 ? '#10b981' : avgEfficiency >= 60 ? '#eab308' : 'hsl(var(--destructive))' }]} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
              <text x="50%" y="55%" textAnchor="middle" className="fill-foreground text-2xl font-bold">{avgEfficiency}%</text>
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pontualidade</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={punctualityData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {punctualityData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Horas Produtivas vs Ociosas por Pessoa</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={productivityByPerson}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="produtivo" stackId="a" fill="#10b981" name="Produtivo (h)" />
              <Bar dataKey="ocioso" stackId="a" fill="#f97316" name="Ocioso (h)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
