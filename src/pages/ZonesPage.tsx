/**
 * VISÃO - Página: Zonas de Interesse - Design Premium Refatorado
 */

import { useState } from 'react';
import { Search, Camera, LayoutGrid, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { EmptyState } from "@/components";
import { ZoneCard, ZoneEditorSheet, ZoneViewDialog } from '@/components/zones';
import { PageMeta } from '@/components/PageMeta';
import { useCameras, DbCamera } from '@/hooks/useCameras';
import { ZonesHeader } from './zones/ZonesHeader';
import { ZonesStats } from './zones/ZonesStats';
import { useZonesState } from './zones/hooks/useZonesState';

type DbZoneLocal = Tables<'zones'>;

export function ZonesPage() {
  const { cameras } = useCameras();
  const {
    loading,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filteredZones,
    stats,
    zoneStats,
    zoneEvents,
    loadZones,
    loadZoneEvents,
    toggleZone,
    deleteZone,
    saveZone,
    zoneTypeConfigs
  } = useZonesState();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorCamera, setEditorCamera] = useState<DbCamera | null>(null);
  const [editingZone, setEditingZone] = useState<DbZoneLocal | null>(null);
  const [viewingZone, setViewingZone] = useState<DbZoneLocal | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DbZoneLocal | null>(null);

  const openEditor = (camera: DbCamera, zone?: DbZoneLocal) => { 
    setEditorCamera(camera); 
    setEditingZone(zone || null); 
    setIsEditorOpen(true); 
  };

  const openView = (zone: DbZoneLocal) => { 
    setViewingZone(zone); 
    loadZoneEvents(zone.id); 
  };

  const getCameraName = (cameraId: string | null) => 
    (!cameraId ? 'Câmera desconhecida' : cameras.find(c => c.id === cameraId)?.name || 'Câmera desconhecida');

  const getCameraById = (cameraId: string | null) => 
    (!cameraId ? null : cameras.find(c => c.id === cameraId));

  const handleSave = async (data: TablesInsert<'zones'> | TablesUpdate<'zones'>) => {
    const success = await saveZone(data, editingZone?.id);
    if (success) setIsEditorOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const success = await deleteZone(deleteConfirm.id);
    if (success) setDeleteConfirm(null);
  };

  return (
    <div role="main" aria-label="Zonas de interesse" className="min-h-screen bg-background mb-mobile-nav">
      <PageMeta title="Zonas" description="Configure zonas de detecção e monitoramento" />

      <ZonesHeader 
        totalCount={stats.total} 
        activeCount={stats.active} 
        loading={loading} 
        cameras={cameras} 
        onRefresh={loadZones} 
        onNewZone={openEditor} 
      />

      <div className="container py-6 space-y-6">
        <ZonesStats 
          total={stats.total} 
          active={stats.active} 
          restricted={stats.restricted} 
          counting={stats.counting} 
          loading={loading} 
        />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar zonas..." 
              value={filters.searchQuery} 
              disabled={loading} 
              onChange={(e) => setFilters(p => ({ ...p, searchQuery: e.target.value }))} 
              className="pl-9 border-border/40 bg-card/60" 
            />
            {!loading && filters.searchQuery && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setFilters(p => ({ ...p, searchQuery: '' }))}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          
          <Select value={filters.selectedCameraFilter} onValueChange={(v) => setFilters(p => ({ ...p, selectedCameraFilter: v }))} disabled={loading}>
            <SelectTrigger className="w-[180px] border-border/40 bg-card/60">
              <Camera className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Câmera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas câmeras</SelectItem>
              {cameras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.selectedTypeFilter} onValueChange={(v) => setFilters(p => ({ ...p, selectedTypeFilter: v }))} disabled={loading}>
            <SelectTrigger className="w-[180px] border-border/40 bg-card/60">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(zoneTypeConfigs).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!loading && hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />Limpar
            </Button>
          )}

          <div className="flex items-center border border-border/40 rounded-lg p-1 ml-auto bg-card/60">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')} disabled={loading}><LayoutGrid className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')} disabled={loading}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          {loading ? 'Carregando zonas...' : `${filteredZones.length} zonas encontradas`}
        </div>

        <div aria-busy={loading} aria-live="polite">
          {loading ? (
            <div role="status" className={cn(viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-2')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[200px] rounded-lg bg-muted/50 animate-pulse border border-border/40" />
              ))}
            </div>
          ) : filteredZones.length === 0 ? (
            <EmptyState 
              icon={<Search />} 
              title={filteredZones.length === 0 && !hasActiveFilters ? 'Nenhuma zona configurada' : 'Nenhuma zona encontrada'}
              description={filteredZones.length === 0 && !hasActiveFilters ? 'Crie zonas de interesse nas suas câmeras.' : 'Nenhuma zona corresponde aos filtros.'}
              action={filteredZones.length === 0 && !hasActiveFilters && cameras.length > 0 ? { label: '+ Criar Zona', onClick: () => openEditor(cameras[0]) } : undefined}
            />
          ) : (
            <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-2')}>
              {filteredZones.map(zone => (
                <ZoneCard 
                  key={zone.id} 
                  zone={zone} 
                  stats={zoneStats[zone.id]} 
                  cameraName={getCameraName(zone.camera_id)} 
                  onView={() => openView(zone)} 
                  onEdit={() => openEditor(getCameraById(zone.camera_id)!, zone)} 
                  onDelete={() => setDeleteConfirm(zone)} 
                  onToggle={() => toggleZone(zone)} 
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ZoneEditorSheet 
        isOpen={isEditorOpen} 
        onClose={() => { setIsEditorOpen(false); setEditingZone(null); setEditorCamera(null); }} 
        camera={editorCamera} 
        zone={editingZone} 
        onSave={handleSave} 
      />

      <ZoneViewDialog 
        zone={viewingZone} 
        camera={viewingZone ? getCameraById(viewingZone.camera_id) ?? null : null} 
        stats={viewingZone ? zoneStats[viewingZone.id] : undefined} 
        events={viewingZone ? zoneEvents[viewingZone.id] || [] : []} 
        isOpen={!!viewingZone} 
        onClose={() => setViewingZone(null)} 
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir a zona <strong>{deleteConfirm?.name}</strong>?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ZonesPage;
