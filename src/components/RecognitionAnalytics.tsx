import { useCopyToClipboard } from "@/hooks";
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfDay, subDays, getHours, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  Users,
  Camera,
  Clock,
  Calendar,
  MapPin,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const DAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface RecognitionAnalyticsProps {
  className?: string;
  dateRange?: number; // days
}

export function RecognitionAnalytics({ className, dateRange = 7 }: RecognitionAnalyticsProps) {
  // Fetch recognition logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ['recognition-analytics', dateRange],
    queryFn: async () => {
      const startDate = subDays(new Date(), dateRange).toISOString();
      
      const { data, error } = await supabase
        .from('recognition_logs')
        .select('*')
        .gte('timestamp', startDate)
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch cameras for location data
  const { data: cameras } = useQuery({
    queryKey: ['cameras-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cameras')
        .select('id, name, location');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch persons for blacklist stats
  const { data: persons } = useQuery({
    queryKey: ['persons-analytics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('id, name, list_type');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Process data for charts
  const analytics = useMemo(() => {
    if (!logs || !cameras) return null;

    const cameraMap = new Map(cameras.map(c => [c.id, c]));
    const personMap = new Map(persons?.map(p => [p.id, p]) || []);

    // Stats
    const totalDetections = logs.length;
    const recognized = logs.filter(l => l.recognized).length;
    const unknown = totalDetections - recognized;
    const blacklistDetections = logs.filter(l => {
      const person = personMap.get(l.person_id);
      return person?.list_type === 'blacklist';
    }).length;

    // Hourly distribution
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}h`,
      recognized: 0,
      unknown: 0,
      total: 0,
    }));

    logs.forEach(log => {
      const hour = getHours(new Date(log.timestamp));
      hourlyData[hour].total++;
      if (log.recognized) {
        hourlyData[hour].recognized++;
      } else {
        hourlyData[hour].unknown++;
      }
    });

    // Daily distribution (by day of week)
    const dailyData = DAY_NAMES.map((name, idx) => ({
      day: name,
      dayIndex: idx,
      recognized: 0,
      unknown: 0,
      total: 0,
    }));

    logs.forEach(log => {
      const dayIndex = getDay(new Date(log.timestamp));
      dailyData[dayIndex].total++;
      if (log.recognized) {
        dailyData[dayIndex].recognized++;
      } else {
        dailyData[dayIndex].unknown++;
      }
    });

    // Camera distribution
    const cameraData: { name: string; location: string; count: number; recognized: number }[] = [];
    const cameraStats = new Map<string, { count: number; recognized: number }>();

    logs.forEach(log => {
      if (!log.camera_id) return;
      const current = cameraStats.get(log.camera_id) || { count: 0, recognized: 0 };
      current.count++;
      if (log.recognized) current.recognized++;
      cameraStats.set(log.camera_id, current);
    });

    cameraStats.forEach((stats, cameraId) => {
      const camera = cameraMap.get(cameraId);
      if (camera) {
        cameraData.push({
          name: camera.name,
          location: camera.location || 'Sem localização',
          count: stats.count,
          recognized: stats.recognized,
        });
      }
    });

    cameraData.sort((a, b) => b.count - a.count);

    // Trend over time (last N days)
    const trendData: { date: string; recognized: number; unknown: number; total: number }[] = [];
    const dayStats = new Map<string, { recognized: number; unknown: number }>();

    logs.forEach(log => {
      const dateKey = format(new Date(log.timestamp), 'dd/MM');
      const current = dayStats.get(dateKey) || { recognized: 0, unknown: 0 };
      if (log.recognized) {
        current.recognized++;
      } else {
        current.unknown++;
      }
      dayStats.set(dateKey, current);
    });

    // Fill in missing days
    for (let i = dateRange - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, 'dd/MM');
      const stats = dayStats.get(dateKey) || { recognized: 0, unknown: 0 };
      trendData.push({
        date: dateKey,
        recognized: stats.recognized,
        unknown: stats.unknown,
        total: stats.recognized + stats.unknown,
      });
    }

    // Recognition rate pie chart
    const pieData = [
      { name: 'Reconhecidos', value: recognized, color: 'hsl(var(--chart-2))' },
      { name: 'Desconhecidos', value: unknown, color: 'hsl(var(--muted-foreground))' },
    ];

    // Peak hours
    const peakHour = hourlyData.reduce((max, curr) => 
      curr.total > max.total ? curr : max, hourlyData[0]);

    // Peak day
    const peakDay = dailyData.reduce((max, curr) => 
      curr.total > max.total ? curr : max, dailyData[0]);

    return {
      stats: {
        totalDetections,
        recognized,
        unknown,
        blacklistDetections,
        recognitionRate: totalDetections > 0 ? (recognized / totalDetections) * 100 : 0,
      },
      hourlyData,
      dailyData,
      cameraData,
      trendData,
      pieData,
      peakHour,
      peakDay,
    };
  }, [logs, cameras, persons, dateRange]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={className}>
        <div className="text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium">Sem dados suficientes</h3>
          <p className="text-muted-foreground">
            Inicie o reconhecimento facial para gerar analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{analytics.stats.totalDetections}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <UserCheck className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reconhecidos</p>
                <p className="text-2xl font-bold text-green-500">{analytics.stats.recognized}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <UserX className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Desconhecidos</p>
                <p className="text-2xl font-bold">{analytics.stats.unknown}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Blacklist</p>
                <p className="text-2xl font-bold text-destructive">{analytics.stats.blacklistDetections}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Over Time */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Tendência de Detecções
            </CardTitle>
            <CardDescription>Últimos {dateRange} dias</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="recognized"
                    name="Reconhecidos"
                    stackId="1"
                    stroke="hsl(var(--chart-2))"
                    fill="hsl(var(--chart-2))"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="unknown"
                    name="Desconhecidos"
                    stackId="1"
                    stroke="hsl(var(--muted-foreground))"
                    fill="hsl(var(--muted-foreground))"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Hourly Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Distribuição por Hora
                </CardTitle>
                <CardDescription>
                  Pico: {analytics.peakHour.hour} ({analytics.peakHour.total} detecções)
                </CardDescription>
              </div>
              <Badge variant="secondary">{analytics.peakHour.hour}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="hour" 
                    className="text-xs" 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    interval={2}
                  />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="recognized" name="Reconhecidos" fill="hsl(var(--chart-2))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="unknown" name="Desconhecidos" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Distribution */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Distribuição por Dia
                </CardTitle>
                <CardDescription>
                  Pico: {analytics.peakDay.day} ({analytics.peakDay.total} detecções)
                </CardDescription>
              </div>
              <Badge variant="secondary">{analytics.peakDay.day}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="recognized" name="Reconhecidos" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unknown" name="Desconhecidos" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recognition Rate Pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de Reconhecimento</CardTitle>
            <CardDescription>
              {analytics.stats.recognitionRate.toFixed(1)}% de sucesso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analytics.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Camera Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Detecções por Câmera
            </CardTitle>
            <CardDescription>Top câmeras com mais atividade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.cameraData.slice(0, 5).map((camera, idx) => (
                <div key={camera.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{camera.name}</span>
                      <Badge variant="outline" className="text-xs">
                        <MapPin className="h-3 w-3 mr-1" />
                        {camera.location}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground">{camera.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${(camera.count / analytics.cameraData[0].count) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}

              {analytics.cameraData.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma câmera com dados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
