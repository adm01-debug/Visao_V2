/**
 * Gráficos do módulo de Câmeras
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar,
} from 'recharts';

interface CameraData {
  id: string;
  name: string;
  status: string;
  location: string;
  alerts_count?: number | null;
  detected_people?: number | null;
}

const STATUS_COLORS: Record<string, string> = {
  online: '#10b981',
  offline: '#6b7280',
  alert: 'hsl(var(--destructive))',
  warning: '#f97316',
};

export function CamerasCharts({ cameras }: { cameras: CameraData[] }) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    cameras.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name: name === 'online' ? 'Online' : name === 'offline' ? 'Offline' : name === 'alert' ? 'Alerta' : 'Aviso',
      value,
      fill: STATUS_COLORS[name] || '#888',
    }));
  }, [cameras]);

  const alertsPerCamera = useMemo(() => {
    return cameras
      .filter(c => (c.alerts_count ?? 0) > 0)
      .sort((a, b) => (b.alerts_count ?? 0) - (a.alerts_count ?? 0))
      .slice(0, 8)
      .map(c => ({ name: c.name.slice(0, 15), alerts: c.alerts_count ?? 0 }));
  }, [cameras]);

  const peoplePerCamera = useMemo(() => {
    return cameras
      .filter(c => (c.detected_people ?? 0) > 0)
      .sort((a, b) => (b.detected_people ?? 0) - (a.detected_people ?? 0))
      .slice(0, 8)
      .map(c => ({ name: c.name.slice(0, 15), people: c.detected_people ?? 0 }));
  }, [cameras]);

  const locationData = useMemo(() => {
    const counts: Record<string, number> = {};
    cameras.forEach(c => {
      const loc = c.location || 'Sem local';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.slice(0, 20), value }));
  }, [cameras]);

  const uptimePercent = useMemo(() => {
    if (cameras.length === 0) return 0;
    const online = cameras.filter(c => c.status === 'online').length;
    return Math.round((online / cameras.length) * 100);
  }, [cameras]);

  if (cameras.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status das Câmeras</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {statusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Uptime Geral</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: uptimePercent, fill: uptimePercent > 80 ? '#10b981' : uptimePercent > 50 ? '#eab308' : 'hsl(var(--destructive))' }]} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
              <text x="50%" y="55%" textAnchor="middle" className="fill-foreground text-2xl font-bold">{uptimePercent}%</text>
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {alertsPerCamera.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Alertas por Câmera</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={alertsPerCamera} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={80} className="text-xs" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="alerts" fill="hsl(var(--destructive))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Câmeras por Local</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 9 }} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
