/**
 * VISÃO - HeatmapVisualization (Refactored)
 * Subcomponents: HeatmapHeader, HeatmapStatsCards, HeatmapMatrixTab
 */

import { memo, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCameras } from '@/hooks/useCameras';
import { useHeatmap, TimeRange } from '@/hooks/useHeatmap';
import { TrendingUp, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subHours, subDays } from 'date-fns';
import { HeatmapHeader } from './heatmap/HeatmapHeader';
import { HeatmapStatsCards } from './heatmap/HeatmapStatsCards';
import { HeatmapMatrixTab, type ZoneActivity } from './heatmap/HeatmapMatrixTab';

interface HeatmapVisualizationProps { className?: string; }

export function HeatmapVisualization({ className }: HeatmapVisualizationProps) {
  const { user } = useAuth();
  const { cameras } = useCameras();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [zoneActivities, setZoneActivities] = useState<ZoneActivity[]>([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const heatmap = useHeatmap({
    cameraId: selectedCamera !== 'all' ? selectedCamera : cameras[0]?.id || '',
    width: 640, height: 480,
    config: { gridSize: 20, colorScheme: 'thermal', opacity: 0.7, blur: 15, realtime: false },
  });

  useEffect(() => {
    if (canvasRef.current && heatmap.heatmapData && heatmap.heatmapData.grid.length > 0)
      heatmap.renderToCanvas(canvasRef.current);
  }, [heatmap.heatmapData, canvasRef.current]);

  useEffect(() => { if (selectedCamera !== 'all') heatmap.loadHistory(period as TimeRange); }, [period, selectedCamera]);

  useEffect(() => { if (user) loadData(); }, [user, period, selectedCamera, refreshKey]);

  // Realtime: re-fetch when new zone_events or recognition_logs arrive for this user
  useEffect(() => {
    if (!user) return;
    const channelId = `heatmap-rt-${user.id}-${Date.now()}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'zone_events', filter: `user_id=eq.${user.id}` },
        () => setRefreshKey(k => k + 1))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recognition_logs', filter: `user_id=eq.${user.id}` },
        () => setRefreshKey(k => k + 1))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let startDate: Date;
      switch (period) {
        case '1h': startDate = subHours(new Date(), 1); break;
        case '6h': startDate = subHours(new Date(), 6); break;
        case '24h': startDate = subHours(new Date(), 24); break;
        case '7d': startDate = subDays(new Date(), 7); break;
      }

      let zonesQuery = supabase.from('zones').select('*').eq('user_id', user.id).eq('is_active', true);
      if (selectedCamera !== 'all') zonesQuery = zonesQuery.eq('camera_id', selectedCamera);
      const { data: zones } = await zonesQuery;

      const { data: events } = await supabase.from('zone_events').select('*')
        .eq('user_id', user.id).gte('timestamp', startDate.toISOString()).order('timestamp', { ascending: true });

      let logsQuery = supabase.from('recognition_logs').select('*')
        .eq('user_id', user.id).gte('timestamp', startDate.toISOString());
      if (selectedCamera !== 'all') logsQuery = logsQuery.eq('camera_id', selectedCamera);
      const { data: recognitionLogs } = await logsQuery;

      const activities: ZoneActivity[] = (zones || []).map(zone => {
        const zoneEvents = (events || []).filter(e => e.zone_id === zone.id);
        const hourlyMap = new Map<number, number>();
        for (let i = 0; i < 24; i++) hourlyMap.set(i, 0);
        zoneEvents.forEach(e => { const h = new Date(e.timestamp).getHours(); hourlyMap.set(h, (hourlyMap.get(h) || 0) + 1); });
        const hourlyData = Array.from(hourlyMap.entries()).map(([hour, count]) => ({ hour, count, intensity: 0 })).sort((a, b) => a.hour - b.hour);
        const maxCount = Math.max(...hourlyData.map(h => h.count), 1);
        hourlyData.forEach(h => { h.intensity = h.count / maxCount; });
        const peak = hourlyData.reduce((max, h) => h.count > max.count ? h : max, { hour: 0, count: 0 });
        const recent = zoneEvents.filter(e => new Date(e.timestamp) > subHours(new Date(), 1)).length;
        const prev = zoneEvents.filter(e => { const t = new Date(e.timestamp); return t > subHours(new Date(), 2) && t <= subHours(new Date(), 1); }).length;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (recent > prev * 1.2) trend = 'up'; else if (recent < prev * 0.8) trend = 'down';
        return { id: zone.id, name: zone.name, total: zoneEvents.length, hourly: hourlyData, peak, trend };
      });

      activities.sort((a, b) => b.total - a.total);
      setZoneActivities(activities);
      setTotalDetections((recognitionLogs || []).length);
    } catch { /* dados de mapa de calor best-effort; ignora falha de consulta */ } finally { setLoading(false); }
  };

  const stats = useMemo(() => {
    const totalEvents = zoneActivities.reduce((s, z) => s + z.total, 0);
    return { totalEvents, hotZone: zoneActivities[0] };
  }, [zoneActivities]);

  return (
    <div className={cn('space-y-6', className)}>
      <HeatmapHeader cameras={cameras} selectedCamera={selectedCamera} setSelectedCamera={setSelectedCamera}
        period={period} setPeriod={setPeriod} loading={loading} onRefresh={() => setRefreshKey(k => k + 1)} />
      <HeatmapStatsCards totalEvents={stats.totalEvents} totalDetections={totalDetections}
        activeZones={zoneActivities.length} hotZoneName={stats.hotZone?.name || ''} />

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList>
          <TabsTrigger value="matrix">Matriz de Calor</TabsTrigger>
          <TabsTrigger value="zones">Por Zona</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix"><HeatmapMatrixTab zoneActivities={zoneActivities} loading={loading} /></TabsContent>

        <TabsContent value="zones">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {zoneActivities.map(zone => (
              <Card key={zone.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{zone.name}</CardTitle>
                    <Badge variant={zone.trend === 'up' ? 'destructive' : zone.trend === 'down' ? 'secondary' : 'outline'} className="gap-1">
                      {zone.trend === 'up' && <TrendingUp className="h-3 w-3" />}
                      {zone.trend === 'down' && <TrendingUp className="h-3 w-3 rotate-180" />}
                      {zone.trend === 'up' ? 'Aumentando' : zone.trend === 'down' ? 'Diminuindo' : 'Estável'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total:</span><span className="font-medium">{zone.total}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pico:</span><span className="font-medium">{zone.peak.hour}h ({zone.peak.count})</span></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Timeline de Atividade</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {zoneActivities.slice(0, 10).map(zone => (
                  <div key={zone.id} className="space-y-2">
                    <div className="flex items-center justify-between"><span className="font-medium">{zone.name}</span><span className="text-sm text-muted-foreground">{zone.total} eventos</span></div>
                    <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                      <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/50 rounded-full"
                        style={{ width: `${(zone.total / (stats.hotZone?.total || 1)) * 100}%` }} />
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
