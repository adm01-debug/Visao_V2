/**
 * Gráficos do módulo de Logs de Reconhecimento
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { Tables } from '@/integrations/supabase/types';

type RecognitionLog = Tables<'recognition_logs'>;

export function RecognitionCharts({ logs }: { logs: RecognitionLog[] }) {
  const recognitionRate = useMemo(() => {
    const recognized = logs.filter(l => l.recognized).length;
    return [
      { name: 'Reconhecido', value: recognized, fill: '#10b981' },
      { name: 'Desconhecido', value: logs.length - recognized, fill: '#f97316' },
    ];
  }, [logs]);

  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, recognized: 0, unknown: 0 }));
    logs.forEach(l => {
      const h = new Date(l.timestamp).getHours();
      if (l.recognized) hours[h].recognized++;
      else hours[h].unknown++;
    });
    return hours;
  }, [logs]);

  const confidenceDistribution = useMemo(() => {
    const buckets = [
      { label: '0-50%', min: 0, max: 50, count: 0 },
      { label: '50-70%', min: 50, max: 70, count: 0 },
      { label: '70-85%', min: 70, max: 85, count: 0 },
      { label: '85-95%', min: 85, max: 95, count: 0 },
      { label: '95-100%', min: 95, max: 101, count: 0 },
    ];
    logs.forEach(l => {
      const conf = (l.confidence ?? 0) * 100;
      const bucket = buckets.find(b => conf >= b.min && conf < b.max);
      if (bucket) bucket.count++;
    });
    return buckets.map(b => ({ name: b.label, count: b.count }));
  }, [logs]);

  const dailyTrend = useMemo(() => {
    const days: Record<string, { date: string; total: number; recognized: number }> = {};
    logs.forEach(l => {
      const d = new Date(l.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!days[d]) days[d] = { date: d, total: 0, recognized: 0 };
      days[d].total++;
      if (l.recognized) days[d].recognized++;
    });
    return Object.values(days).slice(-14);
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Taxa de Reconhecimento</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={recognitionRate} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {recognitionRate.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Atividade por Hora</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" interval={3} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="recognized" stackId="a" fill="#10b981" name="Reconhecido" />
              <Bar dataKey="unknown" stackId="a" fill="#f97316" name="Desconhecido" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Distribuição de Confiança</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={confidenceDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tendência Diária</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Area type="monotone" dataKey="total" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} name="Total" />
              <Area type="monotone" dataKey="recognized" fill="rgba(16,185,129,0.2)" stroke="#10b981" strokeWidth={2} name="Reconhecido" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
