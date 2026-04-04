/**
 * VISÃO - Dashboard V2 (Modularizado)
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { Camera, AlertTriangle, Users, Shield, TrendingUp, Activity, CheckCheck, ArrowUpDown, Map, Video, LayoutGrid, Maximize2, Brain, RefreshCw } from 'lucide-react';
import { StatsCard } from '@/components/StatsCard';
import { AlertCard, UIAlert } from '@/components/AlertCard';
import { CameraModal } from '@/components/CameraModal';
import { ExportMenu } from '@/components/ExportMenu';
import { LazyCameraMap as CameraMap } from '@/components/LazyCameraMap';
import { AlertTrendsChart } from '@/components/AlertTrendsChart';
import { AlertsByCameraChart } from '@/components/AlertsByCameraChart';
import { filterAlerts, defaultFilters, AlertFilters } from '@/components/AlertFilters';
import { SearchInput, filterCamerasBySearch, filterAlertsBySearch } from '@/components/SearchInput';
import { PaginationControls, usePagination } from '@/components/PaginationControls';
import { OnboardingTour } from '@/components/OnboardingTour';
import { PageMeta } from '@/components/PageMeta';
import { useCameras, DbCamera } from '@/hooks/useCameras';
import { useAlerts } from '@/hooks/useAlerts';
import { useRules } from '@/hooks/useRules';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { exportAlerts, exportCameras } from '@/lib/exportUtils';
import { toast } from 'sonner';

import { CameraStreamCard } from '@/components/dashboard/CameraStreamCard';
import type { UICameraData } from '@/components/dashboard/CameraStreamCard';
import { SettingsSheet } from '@/components/dashboard/SettingsSheet';
import { defaultSettings, sortAlerts } from '@/components/dashboard/DashboardTypes';
import type { DashboardSettings, AlertSortOption, ViewMode, GridLayout } from '@/components/dashboard/DashboardTypes';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { WidgetLayoutConfig } from '@/components/dashboard/WidgetLayoutConfig';

function mapDbCameraToUI(dbCamera: DbCamera): UICameraData {
  return {
    id: dbCamera.id, name: dbCamera.name, location: dbCamera.location, status: dbCamera.status,
    thumbnail: dbCamera.thumbnail || undefined, lastActivity: dbCamera.last_activity || undefined,
    detectedPeople: dbCamera.detected_people || 0, alerts: dbCamera.alerts_count || 0,
    latitude: dbCamera.latitude, longitude: dbCamera.longitude,
    streamUrl: (dbCamera as Record<string, unknown>).stream_url as string | undefined,
    streamProtocol: ((dbCamera as Record<string, unknown>).stream_protocol as string) || 'hls',
  };
}

export function DashboardV2() {
  const [selectedCamera, setSelectedCamera] = useState<UICameraData | null>(null);
  const [alertFilters, setAlertFilters] = useState<AlertFilters>(defaultFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertSortBy, setAlertSortBy] = useState<AlertSortOption>('date-desc');
  const [settings, setSettings] = useState<DashboardSettings>(() => {
    const saved = localStorage.getItem('dashboard-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const { widgets, visibleWidgets, toggleWidget, reorderWidgets, resetLayout } = useDashboardLayout();
  const { cameras, loading: camerasLoading, updateCamera, refetch: refetchCameras } = useCameras();
  const { alerts, loading: alertsLoading, unreadCount, markAllAsRead, refetch: refetchAlerts } = useAlerts();
  const { rules } = useRules();

  // Filter active rules for analysis
  const activeRules = useMemo(() => rules.filter(r => r.is_active), [rules]);

  useEffect(() => { localStorage.setItem('dashboard-settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => {
    if (!settings.autoRefresh) return;
    const id = setInterval(() => { refetchCameras(); refetchAlerts(); }, settings.refreshInterval);
    return () => clearInterval(id);
  }, [settings.autoRefresh, settings.refreshInterval, refetchCameras, refetchAlerts]);

  const loading = camerasLoading || alertsLoading;
  const uiCameras = cameras.map(mapDbCameraToUI);
  const uiAlerts: UIAlert[] = alerts.map(a => ({ id: a.id, cameraId: a.camera_id || '', cameraName: a.camera_name, type: a.type, severity: a.severity, message: a.message, timestamp: new Date(a.timestamp), isRead: a.is_read, thumbnail: a.thumbnail || undefined }));

  const searchedCameras = filterCamerasBySearch(uiCameras, searchQuery);
  const priorityCameras = searchedCameras.filter(c => c.status === 'alert' || c.status === 'warning');
  const normalCameras = searchedCameras.filter(c => c.status === 'online' || c.status === 'offline');
  const totalPeople = uiCameras.reduce((s, c) => s + (c.detectedPeople || 0), 0);
  const onlineCameras = uiCameras.filter(c => c.status !== 'offline').length;
  const activeAlerts = uiAlerts.filter(a => !a.isRead).length;
  const streamingCameras = uiCameras.filter(c => c.streamUrl).length;

  const filteredAlerts = useMemo(() => {
    const af = filterAlerts(uiAlerts.map(a => ({ ...a, timestamp: a.timestamp.toISOString() })), alertFilters);
    return sortAlerts(filterAlertsBySearch(af, searchQuery), alertSortBy);
  }, [uiAlerts, alertFilters, searchQuery, alertSortBy]);

  const { currentPage: alertsPage, setCurrentPage: setAlertsPage, totalPages: alertsTotalPages, paginatedItems: paginatedAlerts, totalItems: alertsTotalItems } = usePagination(filteredAlerts, 5);

  const getGridClass = () => {
    const map: Record<string, string> = { '1x1': 'grid grid-cols-1 gap-4', '2x2': 'grid grid-cols-1 sm:grid-cols-2 gap-4', '3x3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3', '4x4': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2', 'list': 'flex flex-col gap-2' };
    return map[settings.gridLayout] || map['2x2'];
  };

  const handleRefresh = useCallback(() => { refetchCameras(); refetchAlerts(); toast.success('Dados atualizados'); }, [refetchCameras, refetchAlerts]);

  if (loading) {
    return <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]"><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6 overflow-auto h-[calc(100vh-4rem)] mb-mobile-nav">
      <PageMeta title="Dashboard" description="Painel de controle principal do sistema de vigilância" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><h1 className="text-xl sm:text-2xl font-bold">Dashboard</h1><p className="text-xs sm:text-sm text-muted-foreground">{uiCameras.length} câmeras • {streamingCameras} com streaming</p></div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          <Tabs value={settings.viewMode} onValueChange={(v) => setSettings(s => ({ ...s, viewMode: v as ViewMode }))} className="hidden sm:block">
            <TabsList className="h-9"><TabsTrigger value="grid" className="h-7 px-3"><LayoutGrid className="w-4 h-4" /></TabsTrigger><TabsTrigger value="stream" className="h-7 px-3"><Video className="w-4 h-4" /></TabsTrigger><TabsTrigger value="map" className="h-7 px-3"><Map className="w-4 h-4" /></TabsTrigger></TabsList>
          </Tabs>
          <Select value={settings.gridLayout} onValueChange={(v) => setSettings(s => ({ ...s, gridLayout: v as GridLayout }))}><SelectTrigger className="w-20 sm:w-24 h-9"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1x1">1x1</SelectItem><SelectItem value="2x2">2x2</SelectItem><SelectItem value="3x3">3x3</SelectItem><SelectItem value="4x4">4x4</SelectItem><SelectItem value="list">Lista</SelectItem></SelectContent></Select>
          <Button variant="outline" size="icon" onClick={handleRefresh} className="shrink-0"><RefreshCw className="w-4 h-4" /></Button>
          <Button variant="outline" size="icon" onClick={() => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()} className="hidden sm:inline-flex shrink-0"><Maximize2 className="w-4 h-4" /></Button>
          <SettingsSheet settings={settings} onSettingsChange={setSettings} />
        </div>
      </div>

      {settings.showStats && (
        <div className="stats-grid animate-fade-in">
          <StatsCard title="Câmeras" value={`${onlineCameras}/${uiCameras.length}`} subtitle="online" icon={Camera} variant="primary" />
          <StatsCard title="Alertas" value={activeAlerts} subtitle={`${uiAlerts.length} total`} icon={AlertTriangle} variant="danger" />
          <StatsCard title="Pessoas" value={totalPeople} subtitle="detectadas" icon={Users} variant="default" />
          <StatsCard title="Segurança" value="94%" subtitle="score" icon={Shield} variant="success" />
          <StatsCard title="IA" value={settings.enableAnalysis ? 'Ativa' : 'Não'} subtitle={settings.enableFaceRecognition ? 'Face+' : 'Básica'} icon={Brain} variant={settings.enableAnalysis ? 'success' : 'default'} />
        </div>
      )}

      <div className="flex items-center gap-4">
        <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder="Buscar câmeras e alertas..." className="flex-1 max-w-md" />
        {searchQuery && <p className="text-sm text-muted-foreground">{searchedCameras.length} câmeras • {filteredAlerts.length} alertas</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {priorityCameras.length > 0 && <div><div className="flex items-center gap-2 mb-3"><AlertTriangle className="w-5 h-5 text-destructive" /><h2 className="font-semibold">Câmeras com Alertas</h2><Badge variant="destructive">{priorityCameras.length}</Badge></div><div className={getGridClass()}>{priorityCameras.map(cam => <CameraStreamCard key={cam.id} camera={cam} isSelected={selectedCamera?.id === cam.id} onClick={() => setSelectedCamera(cam)} settings={settings} compact={settings.gridLayout === 'list'} analysisRules={activeRules} />)}</div></div>}
          <div><div className="flex items-center justify-between mb-3"><div className="flex items-center gap-2"><Activity className="w-5 h-5 text-primary" /><h2 className="font-semibold">Todas as Câmeras</h2><Badge variant="secondary">{normalCameras.length}</Badge></div><ExportMenu onExportCSV={() => exportCameras(cameras, 'csv')} onExportPDF={() => exportCameras(cameras, 'pdf')} disabled={cameras.length === 0} /></div><div className={getGridClass()}>{normalCameras.map(cam => <CameraStreamCard key={cam.id} camera={cam} isSelected={selectedCamera?.id === cam.id} onClick={() => setSelectedCamera(cam)} settings={settings} compact={settings.gridLayout === 'list'} analysisRules={activeRules} />)}</div></div>
          {settings.showMap && settings.viewMode === 'map' && <div><div className="flex items-center gap-2 mb-3"><Map className="w-5 h-5 text-primary" /><h2 className="font-semibold">Mapa das Câmeras</h2></div><CameraMap cameras={uiCameras} onCameraClick={(id) => { const c = uiCameras.find(x => x.id === id); if (c) setSelectedCamera(c); }} className="h-[400px] rounded-xl" /></div>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><AlertTrendsChart alerts={uiAlerts} /><AlertsByCameraChart alerts={uiAlerts} onCameraClick={(cameraId) => setAlertFilters(prev => ({ ...prev, cameraId }))} /></div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /><h2 className="font-semibold">Alertas</h2>{unreadCount > 0 && <Badge variant="destructive">{unreadCount}</Badge>}</div>
            <div className="flex items-center gap-1">
              <Select value={alertSortBy} onValueChange={(v) => setAlertSortBy(v as AlertSortOption)}><SelectTrigger className="h-7 w-28 text-xs"><ArrowUpDown className="w-3 h-3 mr-1" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="date-desc">Recentes</SelectItem><SelectItem value="severity-desc">Severidade</SelectItem><SelectItem value="type">Tipo</SelectItem></SelectContent></Select>
              {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-7" onClick={() => markAllAsRead()}><CheckCheck className="w-4 h-4" /></Button>}
            </div>
          </div>
          <div className="space-y-2">
            {paginatedAlerts.map(alert => <AlertCard key={alert.id} alert={{ ...alert, timestamp: new Date(alert.timestamp) }} searchQuery={searchQuery} />)}
            {filteredAlerts.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">Nenhum alerta</div>}
          </div>
          {alertsTotalPages > 1 && <PaginationControls currentPage={alertsPage} totalPages={alertsTotalPages} totalItems={alertsTotalItems} itemsPerPage={5} onPageChange={setAlertsPage} compact />}
          <div className="glass-card p-4 mt-4"><div className="flex items-center gap-2 mb-3"><TrendingUp className="w-5 h-5 text-primary" /><h3 className="font-semibold text-sm">Produtividade</h3></div><div className="flex items-center justify-between mb-2"><span className="text-2xl font-bold text-primary">87%</span><Badge variant="outline" className="text-green-500 border-green-500">+3%</Badge></div><div className="h-2 bg-secondary rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: '87%' }} /></div></div>
        </div>
      </div>

      {selectedCamera && <CameraModal camera={selectedCamera} isOpen={!!selectedCamera} onClose={() => setSelectedCamera(null)} onUpdateCoordinates={async (id, latitude, longitude) => { await updateCamera(id, { latitude, longitude }); setSelectedCamera(prev => prev ? { ...prev, latitude, longitude } : null); }} />}
      <OnboardingTour autoStart={true} />
    </div>
  );
}

export default DashboardV2;
