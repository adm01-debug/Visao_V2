/**
 * VISÃO - Página de Câmeras (Refatorada)
 */

import { useState, useMemo } from 'react';
import {
  Camera, Maximize2, Grid3X3, LayoutGrid, List, RefreshCw,
  Search, Plus, X,
} from 'lucide-react';
import { useCameras } from '@/hooks/useCameras';
import { CameraCard, CameraDetailView, GRID_CLASSES } from '@/components/cameras';
import type { CameraData, ViewMode } from '@/components/cameras';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { CamerasCharts } from '@/components/charts/CamerasCharts';

export function CamerasPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid-2x2');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [expandedCamera, setExpandedCamera] = useState<CameraData | null>(null);
  const [settingsCamera, setSettingsCamera] = useState<CameraData | null>(null);

  const { cameras, loading, refetch } = useCameras();

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
    if (currentIndex > 0) setExpandedCamera(filteredCameras[currentIndex - 1]);
  };
  const goToNext = () => {
    if (currentIndex < filteredCameras.length - 1) setExpandedCamera(filteredCameras[currentIndex + 1]);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="aspect-video" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="page-container space-y-4 sm:space-y-6 h-[calc(100vh-4rem)] overflow-auto mb-mobile-nav">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 sm:w-6 sm:h-6" />Câmeras
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {stats.online} de {stats.total} online
            {stats.alert > 0 && ` • ${stats.alert} em alerta`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs sm:text-sm">
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
          <Button size="sm" className="text-xs sm:text-sm">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* Charts */}
      <CamerasCharts cameras={cameras.map(c => ({
        id: c.id, name: c.name, status: c.status, location: c.location || '',
        alerts_count: c.alerts_count, detected_people: c.detected_people,
      }))} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar câmeras..." value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="recording">Gravando</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
        {(searchQuery || statusFilter !== 'all') && (
          <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}>
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
      <div className="text-sm text-muted-foreground">{filteredCameras.length} câmeras</div>

      {/* Camera Grid */}
      {filteredCameras.length === 0 ? (
        <EmptyState
          icon={Camera}
          title={cameras.length === 0 ? 'Nenhuma câmera cadastrada' : 'Nenhuma câmera encontrada'}
          description={cameras.length === 0
            ? 'Adicione sua primeira câmera para começar o monitoramento em tempo real.'
            : 'Nenhuma câmera corresponde aos filtros aplicados. Tente ajustar sua busca.'}
          actionLabel={cameras.length === 0 ? '+ Adicionar Câmera' : undefined}
          onAction={cameras.length === 0 ? () => {} : undefined}
          secondaryActionLabel={cameras.length > 0 ? 'Limpar filtros' : undefined}
          onSecondaryAction={cameras.length > 0 ? () => { setSearchQuery(''); setStatusFilter('all'); } : undefined}
        />
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
            />
          ))}
        </div>
      )}

      {/* Camera Detail Modal */}
      <CameraDetailView
        camera={expandedCamera!} isOpen={!!expandedCamera}
        onClose={() => setExpandedCamera(null)}
        onPrev={goToPrev} onNext={goToNext}
        hasPrev={currentIndex > 0} hasNext={currentIndex < filteredCameras.length - 1}
      />

      {/* Settings Sheet */}
      <Sheet open={!!settingsCamera} onOpenChange={() => setSettingsCamera(null)}>
        <SheetContent>
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
              <div className="space-y-2">
                <Label htmlFor="cam-stream">URL do Stream</Label>
                <Input id="cam-stream" defaultValue={settingsCamera.stream_url || ""} />
              </div>
              <div className="pt-4 flex gap-2">
                <Button className="flex-1" onClick={() => setSettingsCamera(null)}>Salvar</Button>
                <Button variant="outline" onClick={() => setSettingsCamera(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default CamerasPage;
