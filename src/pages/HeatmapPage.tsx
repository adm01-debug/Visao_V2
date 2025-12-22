/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Mapa de Calor
 * 
 * Visualização de mapas de calor com integração direta do hook useHeatmap
 * para controle de dados e configurações na página.
 */

import { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { HeatmapVisualization } from '@/components/HeatmapVisualization';
import { useI18n } from '@/contexts/i18n';
import { useHeatmap } from '@/hooks/useHeatmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Activity, Calendar, MapPin, Download } from 'lucide-react';

export default function HeatmapPage() {
  const { t } = useI18n();
  const [selectedCameraId, setSelectedCameraId] = useState<string | undefined>();
  const [selectedZoneId, setSelectedZoneId] = useState<string | undefined>();
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d' | '30d'>('24h');
  
  // Hook de heatmap com controle direto na página
  const {
    heatmapData,
    isLoading,
    error,
    stats,
    config,
    updateConfig,
    refreshData,
    exportData,
    clearData,
  } = useHeatmap({
    cameraId: selectedCameraId,
    zoneId: selectedZoneId,
    timeRange,
    autoRefresh: true,
    refreshInterval: 30000, // 30 segundos
  });

  // Handler para exportar dados
  const handleExport = useCallback(async () => {
    try {
      await exportData('csv');
    } catch (err) {
      // rm
    }
  }, [exportData]);

  return (
    <>
      <Helmet>
        <title>{t('heatmap.pageTitle', 'Mapa de Calor')} | VISÃO</title>
        <meta name="description" content={t('heatmap.pageDescription', 'Visualize mapas de calor de movimento por zona e câmera')} />
      </Helmet>
      
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          {/* Header com controles */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {t('heatmap.title', 'Mapa de Calor')}
              </h1>
              <p className="text-muted-foreground">
                {t('heatmap.subtitle', 'Visualize a intensidade de movimento por área')}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Seletor de período */}
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-[140px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Última hora</SelectItem>
                  <SelectItem value="6h">Últimas 6h</SelectItem>
                  <SelectItem value="24h">Últimas 24h</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Botão de atualizar */}
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refreshData()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              </Button>
              
              {/* Botão de exportar */}
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
          
          {/* Cards de estatísticas */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Pontos</p>
                      <p className="text-2xl font-bold">{stats.totalPoints?.toLocaleString() || 0}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Intensidade Máx.</p>
                      <p className="text-2xl font-bold">{stats.maxIntensity?.toFixed(1) || 0}</p>
                    </div>
                    <MapPin className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Intensidade Média</p>
                      <p className="text-2xl font-bold">{stats.avgIntensity?.toFixed(1) || 0}</p>
                    </div>
                    <MapPin className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Zonas Ativas</p>
                      <p className="text-2xl font-bold">{stats.activeZones || 0}</p>
                    </div>
                    <Badge variant="secondary">{stats.coverage || '0%'}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Visualização do Heatmap */}
          <HeatmapVisualization 
            data={heatmapData}
            isLoading={isLoading}
            error={error}
          />
        </main>
      </div>
    </>
  );
}
