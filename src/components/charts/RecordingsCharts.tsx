/**
 * Gráficos do módulo de Gravações
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts';

interface Recording {
  id: string;
  status: string;
  started_at: string;
  duration_seconds?: number | null;
  file_size_bytes?: number | null;
  camera_id?: string | null;
  quality?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  completed: '#10b981',
  recording: 'hsl(var(--primary))',
  failed: 'hsl(var(--destructive))',
  processing: '#eab308',
};

export function RecordingsCharts({ recordings }: { recordings: Recording[] }) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    recordings.forEach(r => { counts[r.status] = (counts[r.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, fill: STATUS_COLORS[name] || '#888',
    }));
  }, [recordings]);

  const dailyRecordings = useMemo(() => {
    const days: Record<string, number> = {};
    recordings.forEach(r => {
      const d = new Date(r.started_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days[d] = (days[d] || 0) + 1;
    });
    return Object.entries(days).slice(-14).map(([date, count]) => ({ date, count }));
  }, [recordings]);

  const storageByCam = useMemo(() => {
    const sizes: Record<string, number> = {};
    recordings.forEach(r => {
      const cam = r.camera_id || 'Desconhecida';
      sizes[cam] = (sizes[cam] || 0) + (r.file_size_bytes || 0);
    });
    return Object.entries(sizes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, bytes]) => ({ name: name.slice(0, 12), sizeMB: Math.round(bytes / 1024 / 1024) }));
  }, [recordings]);

  const durationDistribution = useMemo(() => {
    const buckets = [
      { label: '<1min', min: 0, max: 60, count: 0 },
      { label: '1-5min', min: 60, max: 300, count: 0 },
      { label: '5-15min', min: 300, max: 900, count: 0 },
      { label: '15-60min', min: 900, max: 3600, count: 0 },
      { label: '>1h', min: 3600, max: Infinity, count: 0 },
    ];
    recordings.forEach(r => {
      const d = r.duration_seconds || 0;
      const bucket = buckets.find(b => d >= b.min && d < b.max);
      if (bucket) bucket.count++;
    });
    return buckets.map(b => ({ name: b.label, count: b.count }));
  }, [recordings]);

  if (recordings.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status das Gravações</CardTitle></CardHeader>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Gravações por Dia</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyRecordings}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Area type="monotone" dataKey="count" fill="hsl(var(--primary) / 0.2)" stroke="hsl(var(--primary))" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Distribuição por Duração</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={durationDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {storageByCam.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Armazenamento por Câmera (MB)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={storageByCam} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={80} className="text-xs" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="sizeMB" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
