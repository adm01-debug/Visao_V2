import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, subDays, getHours, getDay } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import { TrendingUp, Clock, Calendar, Camera, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RecognitionStatsCards } from './recognition/RecognitionStatsCards';

const CHART_TOOLTIP_STYLE = { backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };
const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RecognitionAnalyticsProps { className?: string; dateRange?: number; }

export function RecognitionAnalytics({ className, dateRange = 7 }: RecognitionAnalyticsProps) {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['recognition-analytics', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase.from('recognition_logs').select('*')
        .gte('timestamp', subDays(new Date(), dateRange).toISOString()).order('timestamp', { ascending: false });
      if (error) throw error; return data || [];
    },
  });

  const { data: cameras } = useQuery({
    queryKey: ['cameras-analytics'],
    queryFn: async () => { const { data, error } = await supabase.from('cameras').select('id, name, location'); if (error) throw error; return data || []; },
  });

  const { data: persons } = useQuery({
    queryKey: ['persons-analytics'],
    queryFn: async () => { const { data, error } = await supabase.from('registered_persons').select('id, name, list_type'); if (error) throw error; return data || []; },
  });

  const analytics = useMemo(() => {
    if (!logs || !cameras) return null;
    const cameraMap = new Map(cameras.map(c => [c.id, c]));
    const personMap = new Map(persons?.map(p => [p.id, p]) || []);

    const totalDetections = logs.length;
    const recognized = logs.filter(l => l.recognized).length;
    const unknown = totalDetections - recognized;
    const blacklistDetections = logs.filter(l => { const p = l.person_id ? personMap.get(l.person_id) : undefined; return p?.list_type === 'blacklist'; }).length;

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({ hour: `${hour.toString().padStart(2, '0')}h`, recognized: 0, unknown: 0, total: 0 }));
    logs.forEach(log => { const h = getHours(new Date(log.timestamp)); const e = hourlyData[h]; if (e) { e.total++; if (log.recognized) e.recognized++; else e.unknown++; } });

    const dailyData = DAY_NAMES.map((name, idx) => ({ day: name, dayIndex: idx, recognized: 0, unknown: 0, total: 0 }));
    logs.forEach(log => { const d = getDay(new Date(log.timestamp)); const e = dailyData[d]; if (e) { e.total++; if (log.recognized) e.recognized++; else e.unknown++; } });

    const cameraStats = new Map<string, { count: number; recognized: number }>();
    logs.forEach(log => { if (!log.camera_id) return; const c = cameraStats.get(log.camera_id) || { count: 0, recognized: 0 }; c.count++; if (log.recognized) c.recognized++; cameraStats.set(log.camera_id, c); });
    const cameraData: { name: string; location: string; count: number }[] = [];
    cameraStats.forEach((s, id) => { const cam = cameraMap.get(id); if (cam) cameraData.push({ name: cam.name, location: cam.location || 'Sem localização', count: s.count }); });
    cameraData.sort((a, b) => b.count - a.count);

    const dayStats = new Map<string, { recognized: number; unknown: number }>();
    logs.forEach(log => { const k = format(new Date(log.timestamp), 'dd/MM'); const c = dayStats.get(k) || { recognized: 0, unknown: 0 }; if (log.recognized) c.recognized++; else c.unknown++; dayStats.set(k, c); });
    const trendData: { date: string; recognized: number; unknown: number; total: number }[] = [];
    for (let i = dateRange - 1; i >= 0; i--) { const k = format(subDays(new Date(), i), 'dd/MM'); const s = dayStats.get(k) || { recognized: 0, unknown: 0 }; trendData.push({ date: k, recognized: s.recognized, unknown: s.unknown, total: s.recognized + s.unknown }); }

    const pieData = [
      { name: 'Reconhecidos', value: recognized, color: 'hsl(var(--chart-2))' },
      { name: 'Desconhecidos', value: unknown, color: 'hsl(var(--muted-foreground))' },
    ];

    const peakHour = hourlyData.reduce((m, c) => c.total > m.total ? c : m, hourlyData[0]!);
    const peakDay = dailyData.reduce((m, c) => c.total > m.total ? c : m, dailyData[0]!);

    return { stats: { totalDetections, recognized, unknown, blacklistDetections, recognitionRate: totalDetections > 0 ? (recognized / totalDetections) * 100 : 0 }, hourlyData, dailyData, cameraData, trendData, pieData, peakHour, peakDay };
  }, [logs, cameras, persons, dateRange]);

  if (isLoading) return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
    </div>
  );

  if (!analytics) return (
    <div className={className}><div className="text-center py-12"><TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="text-lg font-medium">Sem dados suficientes</h3><p className="text-muted-foreground">Inicie o reconhecimento facial para gerar analytics.</p></div></div>
  );

  return (
    <div className={className}>
      <RecognitionStatsCards total={analytics.stats.totalDetections} recognized={analytics.stats.recognized} unknown={analytics.stats.unknown} blacklist={analytics.stats.blacklistDetections} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />Tendência</CardTitle><CardDescription>Últimos {dateRange} dias</CardDescription></CardHeader>
          <CardContent><div className="h-72"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={analytics.trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} /><Legend />
              <Area type="monotone" dataKey="recognized" name="Reconhecidos" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.6} />
              <Area type="monotone" dataKey="unknown" name="Desconhecidos" stackId="1" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.4} />
            </AreaChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Por Hora</CardTitle><CardDescription>Pico: {analytics.peakHour.hour}</CardDescription></div><Badge variant="secondary">{analytics.peakHour.hour}</Badge></div></CardHeader>
          <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.hourlyData}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="hour" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} interval={2} /><YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="recognized" name="Reconhecidos" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} /><Bar dataKey="unknown" name="Desconhecidos" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center justify-between"><div><CardTitle className="text-base flex items-center gap-2"><Calendar className="h-4 w-4" />Por Dia</CardTitle><CardDescription>Pico: {analytics.peakDay.day}</CardDescription></div><Badge variant="secondary">{analytics.peakDay.day}</Badge></div></CardHeader>
          <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.dailyData}><CartesianGrid strokeDasharray="3 3" className="stroke-muted" /><XAxis dataKey="day" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} /><Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
              <Bar dataKey="recognized" name="Reconhecidos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} /><Bar dataKey="unknown" name="Desconhecidos" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de Reconhecimento</CardTitle><CardDescription>{analytics.stats.recognitionRate.toFixed(1)}%</CardDescription></CardHeader>
          <CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={analytics.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>{analytics.pieData.map((e, i) => <Cell key={`cell-${i}`} fill={e.color} />)}</Pie><Tooltip contentStyle={CHART_TOOLTIP_STYLE} /></PieChart></ResponsiveContainer></div></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" />Por Câmera</CardTitle></CardHeader>
          <CardContent><div className="space-y-4">
            {analytics.cameraData.slice(0, 5).map(cam => (
              <div key={cam.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm"><div className="flex items-center gap-2"><span className="font-medium">{cam.name}</span><Badge variant="outline" className="text-xs"><MapPin className="h-3 w-3 mr-1" />{cam.location}</Badge></div><span className="text-muted-foreground">{cam.count}</span></div>
                <div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(cam.count / analytics.cameraData[0]!.count) * 100}%` }} /></div>
              </div>
            ))}
            {analytics.cameraData.length === 0 && <div className="text-center py-8 text-muted-foreground"><Camera className="h-8 w-8 mx-auto mb-2 opacity-50" /><p className="text-sm">Nenhuma câmera com dados</p></div>}
          </div></CardContent>
        </Card>
      </div>
    </div>
  );
}
