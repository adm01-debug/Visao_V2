/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: HeatmapVisualization
 * 
 * Mapa de calor de movimentação por zona em tempo real
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { useI18n } from '@/contexts/i18n';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCameras } from '@/hooks/useCameras';
import { useHeatmap, TimeRange } from '@/hooks/useHeatmap';
import { 
  Activity, 
  Clock, 
  TrendingUp, 
  Users, 
  MapPin,
  Calendar,
  RefreshCw,
  Thermometer
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subHours, subDays, startOfHour, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS
// ============================================

interface HeatmapData {
  zoneId: string;
  zoneName: string;
  cameraId: string;
  cameraName: string;
  count: number;
  intensity: number; // 0-1
  color: string;
  lastActivity: Date | null;
}

interface HourlyData {
  hour: number;
  count: number;
  intensity: number;
}

interface ZoneActivity {
  id: string;
  name: string;
  total: number;
  hourly: HourlyData[];
  peak: { hour: number; count: number };
  trend: 'up' | 'down' | 'stable';
}

interface HeatmapVisualizationProps {
  className?: string;
}

// ============================================
// CORES DO HEATMAP
// ============================================

const getHeatColor = (intensity: number): string => {
  if (intensity >= 0.9) return 'rgba(255, 0, 0, 0.8)';      // Vermelho
  if (intensity >= 0.7) return 'rgba(255, 100, 0, 0.7)';    // Laranja
  if (intensity >= 0.5) return 'rgba(255, 200, 0, 0.6)';    // Amarelo
  if (intensity >= 0.3) return 'rgba(100, 255, 0, 0.5)';    // Verde claro
  if (intensity >= 0.1) return 'rgba(0, 200, 255, 0.4)';    // Azul claro
  return 'rgba(0, 100, 255, 0.3)';                          // Azul
};

const getHeatClass = (intensity: number): string => {
  if (intensity >= 0.9) return 'bg-red-500/80';
  if (intensity >= 0.7) return 'bg-orange-500/70';
  if (intensity >= 0.5) return 'bg-yellow-500/60';
  if (intensity >= 0.3) return 'bg-green-500/50';
  if (intensity >= 0.1) return 'bg-cyan-500/40';
  return 'bg-blue-500/30';
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function HeatmapVisualization({ className }: HeatmapVisualizationProps) {
  const { user } = useAuth();
  const { cameras } = useCameras();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const { t } = useI18n();
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [zoneActivities, setZoneActivities] = useState<ZoneActivity[]>([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Usar hook de heatmap para câmera selecionada
  const heatmap = useHeatmap({
    cameraId: selectedCamera !== 'all' ? selectedCamera : cameras[0]?.id || '',
    config: {
      gridSize: 20,
      colorScheme: 'thermal',
      opacity: 0.7,
      blur: 15,
      realtime: false,
    },
  });

  // Renderizar heatmap no canvas quando dados mudarem
  useEffect(() => {
    if (canvasRef.current && heatmap.data.grid.length > 0) {
      heatmap.renderToCanvas(canvasRef.current);
    }
  }, [heatmap.data, canvasRef.current]);

  // Carregar histórico quando período mudar
  useEffect(() => {
    if (selectedCamera !== 'all') {
      heatmap.loadHistory(period as TimeRange);
    }
  }, [period, selectedCamera]);

  // Carregar dados de atividade
  useEffect(() => {
    if (!user) return;
    loadHeatmapData();
  }, [user, period, selectedCamera, refreshKey]);

  const loadHeatmapData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Calcular período
      let startDate: Date;
      switch (period) {
        case '1h': startDate = subHours(new Date(), 1); break;
        case '6h': startDate = subHours(new Date(), 6); break;
        case '24h': startDate = subHours(new Date(), 24); break;
        case '7d': startDate = subDays(new Date(), 7); break;
      }

      // Buscar zonas
      let zonesQuery = supabase
        .from('zones')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (selectedCamera !== 'all') {
        zonesQuery = zonesQuery.eq('camera_id', selectedCamera);
      }

      const { data: zones } = await zonesQuery;

      // Buscar eventos de zona
      const { data: events } = await supabase
        .from('zone_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: true });

      // Buscar logs de reconhecimento para contagem
      let logsQuery = supabase
        .from('recognition_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('timestamp', startDate.toISOString());

      if (selectedCamera !== 'all') {
        logsQuery = logsQuery.eq('camera_id', selectedCamera);
      }

      const { data: recognitionLogs } = await logsQuery;

      // Processar dados por zona
      const activities: ZoneActivity[] = (zones || []).map(zone => {
        const zoneEvents = (events || []).filter(e => e.zone_id === zone.id);
        
        // Agrupar por hora
        const hourlyMap = new Map<number, number>();
        for (let i = 0; i < 24; i++) {
          hourlyMap.set(i, 0);
        }

        zoneEvents.forEach(event => {
          const hour = new Date(event.timestamp).getHours();
          hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
        });

        const hourlyData: HourlyData[] = Array.from(hourlyMap.entries())
          .map(([hour, count]) => ({
            hour,
            count,
            intensity: 0
          }))
          .sort((a, b) => a.hour - b.hour);

        // Normalizar intensidade
        const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
        hourlyData.forEach(h => {
          h.intensity = h.count / maxCount;
        });

        const peak = hourlyData.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });
        
        // Calcular tendência
        const recentEvents = zoneEvents.filter(e => 
          new Date(e.timestamp) > subHours(new Date(), 1)
        ).length;
        const previousEvents = zoneEvents.filter(e => {
          const t = new Date(e.timestamp);
          return t > subHours(new Date(), 2) && t <= subHours(new Date(), 1);
        }).length;

        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recentEvents > previousEvents * 1.2) trend = 'up';
        else if (recentEvents < previousEvents * 0.8) trend = 'down';

        return {
          id: zone.id,
          name: zone.name,
          total: zoneEvents.length,
          hourly: hourlyData,
          peak,
          trend
        };
      });

      // Ordenar por atividade total
      activities.sort((a, b) => b.total - a.total);

      setZoneActivities(activities);
      setTotalDetections((recognitionLogs || []).length);
    } catch (error) {
      
    } finally {
      setLoading(false);
    }
  };

  // Calcular estatísticas gerais
  const stats = useMemo(() => {
    const totalEvents = zoneActivities.reduce((sum, z) => sum + z.total, 0);
    const avgPerZone = zoneActivities.length > 0 
      ? Math.round(totalEvents / zoneActivities.length) 
      : 0;
    const hotZone = zoneActivities[0];
    
    return { totalEvents, avgPerZone, hotZone };
  }, [zoneActivities]);

  // Gerar matriz de heatmap por hora
  const hourlyMatrix = useMemo(() => {
    const matrix: { hour: number; zones: { name: string; intensity: number }[] }[] = [];
    
    for (let hour = 0; hour < 24; hour++) {
      matrix.push({
        hour,
        zones: zoneActivities.map(z => ({
          name: z.name,
          intensity: z.hourly.find(h => h.hour === hour)?.intensity || 0
        }))
      });
    }
    
    return matrix;
  }, [zoneActivities]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Thermometer className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-xl font-bold">Mapa de Calor</h2>
            <p className="text-sm text-muted-foreground">Visualização de movimentação por zona</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro de câmera */}
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Câmera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {cameras.map(camera => (
                <SelectItem key={camera.id} value={camera.id}>{camera.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de período */}
          <Select value={period} onValueChange={(v) => setPeriod(v as unknown)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 hora</SelectItem>
              <SelectItem value="6h">6 horas</SelectItem>
              <SelectItem value="24h">24 horas</SelectItem>
              <SelectItem value="7d">7 dias</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => setRefreshKey(k => k + 1)}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalEvents}</p>
                <p className="text-sm text-muted-foreground">Eventos Totais</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDetections}</p>
                <p className="text-sm text-muted-foreground">Detecções</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <MapPin className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{zoneActivities.length}</p>
                <p className="text-sm text-muted-foreground">Zonas Ativas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold truncate">{stats.hotZone?.name || '-'}</p>
                <p className="text-sm text-muted-foreground">Zona Mais Ativa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Matriz de Calor</TabsTrigger>
          <TabsTrigger value="zones">Por Zona</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        {/* Matriz de Calor */}
        <TabsContent value="matrix">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Atividade por Hora
              </CardTitle>
              <CardDescription>
                Intensidade de movimentação em cada zona ao longo do dia
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : zoneActivities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>Nenhuma zona configurada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left p-2 font-medium">{t('common.zone', 'Zona')}</th>
                        {Array.from({ length: 24 }, (_, i) => (
                          <th key={i} className="p-1 text-center text-xs text-muted-foreground">
                            {i.toString().padStart(2, '0')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {zoneActivities.map(zone => (
                        <tr key={zone.id}>
                          <td className="p-2 font-medium whitespace-nowrap">{zone.name}</td>
                          {zone.hourly.map((h, idx) => (
                            <td key={idx} className="p-0.5">
                              <div
                                className={cn(
                                  'w-6 h-6 rounded-sm transition-all hover:scale-125',
                                  getHeatClass(h.intensity)
                                )}
                                title={`${zone.name} - ${h.hour}h: ${h.count} eventos`}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Legenda */}
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <span className="text-sm text-muted-foreground">Menor</span>
                    <div className="flex gap-1">
                      <div className="w-6 h-4 rounded bg-blue-500/30" />
                      <div className="w-6 h-4 rounded bg-cyan-500/40" />
                      <div className="w-6 h-4 rounded bg-green-500/50" />
                      <div className="w-6 h-4 rounded bg-yellow-500/60" />
                      <div className="w-6 h-4 rounded bg-orange-500/70" />
                      <div className="w-6 h-4 rounded bg-red-500/80" />
                    </div>
                    <span className="text-sm text-muted-foreground">Maior</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Por Zona */}
        <TabsContent value="zones">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneActivities.map(zone => (
              <Card key={zone.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{zone.name}</CardTitle>
                    <Badge 
                      variant={zone.trend === 'up' ? 'destructive' : zone.trend === 'down' ? 'secondary' : 'outline'}
                      className="gap-1"
                    >
                      {zone.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                      {zone.trend === 'down' && <TrendingUp className="h-3 w-3 rotate-180" />}
                      {zone.trend === 'up' ? 'Aumentando' : zone.trend === 'down' ? 'Diminuindo' : 'Estável'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de eventos:</span>
                      <span className="font-medium">{zone.total}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Horário de pico:</span>
                      <span className="font-medium">{zone.peak.hour}h ({zone.peak.count} eventos)</span>
                    </div>
                    
                    {/* Mini heatmap */}
                    <div className="flex gap-0.5 mt-2">
                      {zone.hourly.map((h, idx) => (
                        <div
                          key={idx}
                          className={cn('flex-1 h-8 rounded-sm', getHeatClass(h.intensity))}
                          title={`${h.hour}h: ${h.count} eventos`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0h</span>
                      <span>12h</span>
                      <span>23h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Timeline de Atividade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {zoneActivities.slice(0, 10).map(zone => (
                  <div key={zone.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{zone.name}</span>
                      <span className="text-sm text-muted-foreground">{zone.total} eventos</span>
                    </div>
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/50 rounded-full"
                        style={{ 
                          width: `${(zone.total / (stats.hotZone?.total || 1)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(HeatmapVisualization);
