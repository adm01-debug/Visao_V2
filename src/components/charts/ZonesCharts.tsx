/**
 * Gráficos do módulo de Zonas
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { Tables } from '@/integrations/supabase/types';

type Zone = Tables<'zones'>;

const TYPE_COLORS: Record<string, string> = {
  restricted: 'hsl(var(--destructive))',
  monitoring: 'hsl(var(--primary))',
  counting: '#8b5cf6',
  ppe: '#f97316',
  parking: '#06b6d4',
};

const COLORS = ['hsl(var(--primary))', '#f97316', '#8b5cf6', 'hsl(var(--destructive))', '#06b6d4', '#10b981'];

export function ZonesCharts({ zones }: { zones: Zone[] }) {
  const typeData = useMemo(() => {
    const counts: Record<string, number> = {};
    zones.forEach(z => { counts[z.type] = (counts[z.type] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({
      name, value, fill: TYPE_COLORS[name] || '#888',
    }));
  }, [zones]);

  const statusData = useMemo(() => {
    const active = zones.filter(z => z.is_active).length;
    const inactive = zones.length - active;
    return [
      { name: 'Ativas', value: active, fill: '#10b981' },
      { name: 'Inativas', value: inactive, fill: '#6b7280' },
    ];
  }, [zones]);

  const cameraDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    zones.forEach(z => {
      const cam = z.camera_id || 'Sem câmera';
      counts[cam] = (counts[cam] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name: name.slice(0, 12), value }));
  }, [zones]);

  if (zones.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tipos de Zona</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                {typeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status Ativo/Inativo</CardTitle></CardHeader>
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
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Zonas por Câmera</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={cameraDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 9 }} />
              <YAxis className="text-xs" />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {cameraDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
