/**
 * Gráficos do módulo PPE (Equipamentos de Proteção)
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, RadialBarChart, RadialBar,
} from 'recharts';

interface PPEZone {
  id: string;
  name: string;
  camera_id?: string | null;
  requiredPPE: string[];
  enabled: boolean;
  complianceRate?: number;
  lastCheck?: string;
  violations?: number;
}

export function PPECharts({ zones }: { zones: PPEZone[] }) {
  const complianceData = useMemo(() => {
    return zones
      .filter(z => z.complianceRate !== undefined)
      .sort((a, b) => (a.complianceRate ?? 0) - (b.complianceRate ?? 0))
      .slice(0, 8)
      .map(z => ({
        name: z.name.slice(0, 15),
        compliance: z.complianceRate ?? 0,
        fill: (z.complianceRate ?? 0) >= 90 ? '#10b981' : (z.complianceRate ?? 0) >= 70 ? '#eab308' : 'hsl(var(--destructive))',
      }));
  }, [zones]);

  const statusData = useMemo(() => {
    const enabled = zones.filter(z => z.enabled).length;
    return [
      { name: 'Ativas', value: enabled, fill: '#10b981' },
      { name: 'Inativas', value: zones.length - enabled, fill: '#6b7280' },
    ];
  }, [zones]);

  const ppeTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    zones.forEach(z => z.requiredPPE?.forEach(ppe => { counts[ppe] = (counts[ppe] || 0) + 1; }));
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  }, [zones]);

  const avgCompliance = useMemo(() => {
    const valid = zones.filter(z => z.complianceRate !== undefined);
    if (valid.length === 0) return 0;
    return Math.round(valid.reduce((sum, z) => sum + (z.complianceRate ?? 0), 0) / valid.length);
  }, [zones]);

  const COLORS = ['hsl(var(--primary))', '#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#eab308'];

  if (zones.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Conformidade Geral</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={180}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{ value: avgCompliance, fill: avgCompliance >= 90 ? '#10b981' : avgCompliance >= 70 ? '#eab308' : 'hsl(var(--destructive))' }]} startAngle={180} endAngle={0}>
              <RadialBar dataKey="value" cornerRadius={8} background={{ fill: 'hsl(var(--muted))' }} />
              <text x="50%" y="55%" textAnchor="middle" className="fill-foreground text-2xl font-bold">{avgCompliance}%</text>
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Zonas Ativas/Inativas</CardTitle></CardHeader>
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

      {complianceData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Conformidade por Zona</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={complianceData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[0, 100]} className="text-xs" />
                <YAxis dataKey="name" type="category" width={80} className="text-xs" tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="compliance" radius={[0, 4, 4, 0]}>
                  {complianceData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {ppeTypeData.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">EPIs Mais Exigidos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={ppeTypeData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 9 }} />
                <YAxis className="text-xs" />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {ppeTypeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
