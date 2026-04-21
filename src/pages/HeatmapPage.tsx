/**
 * VISÃO - Página: Mapa de Calor - Design Premium
 */

import { useState, useCallback } from 'react';
import { PageMeta } from '@/components/PageMeta';
import { HeatmapVisualization } from '@/components/HeatmapVisualization';
import { useHeatmap } from '@/hooks/useHeatmap';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Activity, Calendar, MapPin, Download, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HeatmapPage() {
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  const [refreshing, setRefreshing] = useState(false);

  const heatmapHook = useHeatmap({
    cameraId: selectedCameraId || '',
    width: 640,
    height: 480,
  });
  const { stats } = heatmapHook;
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await heatmapHook.loadHistory('24h');
    setRefreshing(false);
  }, [heatmapHook]);

  return (
    <div role="main" aria-label="Mapa de calor" className="min-h-screen bg-background">
      <PageMeta title="Mapa de Calor" description="Visualize mapas de calor de movimentação" />

      {/* Premium Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-[hsl(var(--severity-high))]/10 border border-[hsl(var(--severity-high))]/20">
                <Flame className="w-6 h-6 text-[hsl(var(--severity-high))]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Mapa de Calor</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Visualize a intensidade de movimento por área</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <Select value={timeRange} onValueChange={(value) => setTimeRange(value as typeof timeRange)}>
                <SelectTrigger className="w-full sm:w-36 border-border/40">
                  <Calendar className="h-4 w-4 mr-2" /><SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Última hora</SelectItem>
                  <SelectItem value="6h">Últimas 6h</SelectItem>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 ml-auto sm:ml-0">
                <Button variant="outline" size="icon" onClick={refreshData} disabled={refreshing} className="border-border/40 shrink-0">
                  <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
                </Button>
                <Button variant="outline" className="border-border/40">
                  <Download className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Exportar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Pontos</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{stats.totalPoints?.toLocaleString() || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Activity className="h-5 w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intensidade Máx.</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{stats.peakActivity?.toFixed(1) || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-destructive/10">
                    <MapPin className="h-5 w-5 text-destructive" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Intensidade Média</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{stats.averageActivity?.toFixed(1) || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-[hsl(var(--severity-medium))]/10">
                    <MapPin className="h-5 w-5 text-[hsl(var(--severity-medium))]" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40" style={{ boxShadow: 'var(--shadow-card)' }}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Zonas Ativas</p>
                    <p className="text-2xl font-bold mt-1 tabular-nums">{stats.hotspots?.length || 0}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-success/10">
                    <Flame className="h-5 w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Heatmap Visualization */}
        <HeatmapVisualization />
      </div>
    </div>
  );
}
