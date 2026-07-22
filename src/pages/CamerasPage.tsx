/**
 * VISÃO - Página de Câmeras (Refatorada)
 */

import { useState, useMemo } from 'react';
import { useManagedFilters } from '@/hooks/useManagedFilters';
import {
  Camera, Maximize2, Grid3X3, LayoutGrid, List, RefreshCw,
  Search, Plus, X,
} from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { useRules } from '@/hooks/useRules';
import { CameraCard, CameraDetailView, GRID_CLASSES } from '@/components/cameras';
import { AddCameraDialog } from '@/components/cameras/AddCameraDialog';
import { FirstCameraEmptyState } from '@/components/cameras/FirstCameraEmptyState';
import { CameraSetupWizard } from '@/components/cameras/CameraSetupWizard';
import { RtspValidationPanel } from '@/components/cameras/RtspValidationPanel';
import { useRtspValidation } from '@/hooks/useRtspValidation';
import { Activity, Loader2 } from 'lucide-react';
import type { CameraData, ViewMode } from '@/components/cameras';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CameraSkeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';

interface CamerasFilters {
  searchQuery: string;
  statusFilter: string;
  [key: string]: unknown;
}
const defaultCamerasFilters: CamerasFilters = { searchQuery: '', statusFilter: 'all' };

export function CamerasPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid-2x2');
  const { filters, setFilters, clearFilters, hasActiveFilters } = useManagedFilters<CamerasFilters>({
    scope: 'cameras',
    defaults: defaultCamerasFilters,
    labels: { searchQuery: 'busca', statusFilter: 'status' },
    isActive: (key, value) => key === 'searchQuery' ? value !== '' : value !== 'all',
  });
  const searchQuery = filters.searchQuery;
  const statusFilter = filters.statusFilter;
  const setSearchQuery = (v: string) => setFilters((p) => ({ ...p, searchQuery: v }));
  const setStatusFilter = (v: string) => setFilters((p) => ({ ...p, statusFilter: v }));
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [expandedCamera, setExpandedCamera] = useState<CameraData | null>(null);
  const [settingsCamera, setSettingsCamera] = useState<CameraData | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addMode, setAddMode] = useState<'quick' | 'guided'>('quick');
  const [setupCamera, setSetupCamera] = useState<CameraData | null>(null);
  const openAdd = (mode: 'quick' | 'guided' = 'quick') => { setAddMode(mode); setAddOpen(true); };
  const diag = useRtspValidation();

  const runDiag = async (target: 'primary' | 'substream') => {
    if (!settingsCamera) return;
    try {
      await diag.validate({ mode: 'camera', cameraId: settingsCamera.id, target });
    } catch {
      /* erro tratado no hook */
    }
  };

  const { cameras, loading, refetch } = useCameras();
  const { rules } = useRules();
  const activeRules = useMemo(() => rules.filter(r => r.is_active), [rules]);
  const filteredCameras = useMemo(() => {
    return cameras.filter(camera => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!camera.name.toLowerCase().includes(query) &&
            !camera.location?.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && camera.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [cameras, searchQuery, statusFilter]);

  const stats = useMemo(() => ({
    total: cameras.length,
    online: cameras.filter(c => c.status !== 'offline').length,
    alert: cameras.filter(c => c.status === 'alert').length,
  }), [cameras]);

  const currentIndex = expandedCamera
    ? filteredCameras.findIndex(c => c.id === expandedCamera.id) : -1;

  const goToPrev = () => {
    if (currentIndex > 0) setExpandedCamera(filteredCameras[currentIndex - 1]!);
  };
  const goToNext = () => {
    if (currentIndex < filteredCameras.length - 1) setExpandedCamera(filteredCameras[currentIndex + 1]!);
  };


  return (
    <PageContent className="space-y-4 sm:space-y-6">
      <PageMeta title="Câmeras" description="Gerencie e monitore suas câmeras de vigilância em tempo real" />
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-page-title flex items-center gap-2">
            <Camera className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />Câmeras
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {loading ? '— de — online' : (
              <>
                {stats.online} de {stats.total} online
                {stats.alert > 0 && ` • ${stats.alert} em alerta`}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading} className="text-xs sm:text-sm">
            <RefreshCw className={cn('w-4 h-4 sm:mr-2', loading && 'animate-spin')} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button size="sm" disabled={loading} onClick={() => openAdd(cameras.length === 0 ? 'guided' : 'quick')} className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar câmeras..." value={searchQuery} disabled={loading}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter} disabled={loading}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="recording">Gravando</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />Limpar
          </Button>
        )}
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
          {[
            { mode: 'grid-1x1' as ViewMode, icon: Maximize2 },
            { mode: 'grid-2x2' as ViewMode, icon: Grid3X3 },
            { mode: 'grid-3x3' as ViewMode, icon: LayoutGrid },
            { mode: 'grid-4x4' as ViewMode, icon: Grid3X3 },
            { mode: 'list' as ViewMode, icon: List },
          ].map(({ mode, icon: Icon }) => (
            <Button key={mode} variant={viewMode === mode ? 'secondary' : 'ghost'}
              size="icon" className="h-8 w-8" onClick={() => setViewMode(mode)}>
              <Icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        {loading ? 'Carregando câmeras...' : `${filteredCameras.length} câmeras`}
      </div>

      {/* Camera Grid */}
      <div aria-busy={loading} aria-live="polite">
        {loading ? (
          <div
            role="status"
            aria-label="Carregando câmeras…"
            className={cn('grid gap-4', GRID_CLASSES[viewMode])}
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <CameraSkeleton key={i} />
            ))}
            <span className="sr-only">Carregando câmeras…</span>
          </div>
        ) : filteredCameras.length === 0 ? (
          cameras.length === 0 ? (
            <FirstCameraEmptyState onStart={() => openAdd('guided')} />
          ) : (
            <EmptyState
              icon={Camera}
              title="Nenhuma câmera encontrada"
              description="Nenhuma câmera corresponde aos filtros aplicados. Tente ajustar sua busca."
              secondaryActionLabel="Limpar filtros"
              onSecondaryAction={clearFilters}
            />
          )
        ) : (
          <div className={cn('grid gap-4', GRID_CLASSES[viewMode])}>
            {filteredCameras.map(camera => (
              <CameraCard
                key={camera.id} camera={camera}
                isSelected={selectedCamera === camera.id}
                viewMode={viewMode}
                onSelect={() => setSelectedCamera(camera.id)}
                onExpand={() => setExpandedCamera(camera)}
                onSettings={() => setSettingsCamera(camera)}
                enableContinuousAnalysis
                analysisRules={activeRules}
              />
            ))}
          </div>
        )}
      </div>

      {/* Camera Detail Modal */}
      <CameraDetailView
        camera={expandedCamera!} isOpen={!!expandedCamera}
        onClose={() => setExpandedCamera(null)}
        onPrev={goToPrev} onNext={goToNext}
        hasPrev={currentIndex > 0} hasNext={currentIndex < filteredCameras.length - 1}
      />

      {/* Settings Sheet */}
      <Sheet
        open={!!settingsCamera}
        onOpenChange={(o) => { if (!o) { setSettingsCamera(null); diag.reset(); } }}
      >
        <SheetContent className="overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Configurações da Câmera</SheetTitle>
            <SheetDescription>{settingsCamera?.name}</SheetDescription>
          </SheetHeader>
          {settingsCamera && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cam-name">Nome</Label>
                <Input id="cam-name" defaultValue={settingsCamera.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cam-location">Localização</Label>
                <Input id="cam-location" defaultValue={settingsCamera.location || ""} />
              </div>

              <div className="space-y-2 pt-2 border-t">
                <Label>Diagnóstico do stream</Label>
                <p className="text-xs text-muted-foreground">
                  Mede latência, jitter e detecta codec via handshake RTSP.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => runDiag('primary')}
                    disabled={diag.loading}
                  >
                    {diag.loading
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <Activity className="h-3 w-3 mr-1" />}
                    Testar principal
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    onClick={() => runDiag('substream')}
                    disabled={diag.loading}
                  >
                    Testar substream
                  </Button>
                </div>
                {(diag.loading || diag.result || diag.error) && (
                  <RtspValidationPanel
                    result={diag.result}
                    loading={diag.loading}
                    error={diag.error}
                    compact
                  />
                )}
              </div>

              <div className="pt-4 flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    const cam = settingsCamera;
                    setSettingsCamera(null);
                    setSetupCamera(cam);
                  }}
                >
                  Zonas & Regras
                </Button>
                <Button className="flex-1" onClick={() => setSettingsCamera(null)}>Fechar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      <AddCameraDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode={addMode}
        onCreated={async (cameraId) => {
          const result = await refetch();
          if (addMode === 'guided' && cameraId) {
            const list = (result as unknown as { data?: CameraData[] } | undefined)?.data ?? cameras;
            const created = list.find((c) => c.id === cameraId)
              ?? cameras.find((c) => c.id === cameraId)
              ?? null;
            if (created) setSetupCamera(created);
          }
        }}
      />
      <CameraSetupWizard
        camera={setupCamera}
        open={!!setupCamera}
        onOpenChange={(o) => { if (!o) setSetupCamera(null); }}
      />
    </PageContent>
  );
}

export default CamerasPage;
