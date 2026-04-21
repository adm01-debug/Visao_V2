/**
 * VISÃO - Página: Zonas de Interesse - Design Premium
 */

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { EmptyState } from "@/components";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Target, Plus, Search, Camera, RefreshCw, LayoutGrid, List, X, ChevronDown, Users, AlertTriangle, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ZonesSkeleton } from '@/components/skeletons/ZonesSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

import { ZoneCard, ZoneEditorSheet, ZoneViewDialog, zoneTypeConfig, type DbZone, type ZoneStats, type ZoneEvent } from '@/components/zones';
import { PageMeta } from '@/components/PageMeta';

type DbZoneLocal = Tables<'zones'>;

export function ZonesPage() {
  const { user } = useAuth();
  const { cameras } = useCameras();

  const [zones, setZones] = useState<DbZoneLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCameraFilter, setSelectedCameraFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorCamera, setEditorCamera] = useState<{ id: string; name: string; stream_url?: string | null; stream_protocol?: string; thumbnail?: string | null } | null>(null);
  const [editingZone, setEditingZone] = useState<DbZoneLocal | null>(null);
  const [viewingZone, setViewingZone] = useState<DbZoneLocal | null>(null);
  const [zoneStats, setZoneStats] = useState<Record<string, ZoneStats>>({});
  const [zoneEvents, setZoneEvents] = useState<Record<string, ZoneEvent[]>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<DbZoneLocal | null>(null);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('zones').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setZones(data || []);

      const statsMap: Record<string, ZoneStats> = {};
      for (const zone of data || []) {
        try {
          const { data: eventsData } = await supabase.from('zone_events').select('event_type, timestamp').eq('zone_id', zone.id).gte('timestamp', new Date(Date.now() - 86400000).toISOString()).order('timestamp', { ascending: false });
          if (eventsData) {
            statsMap[zone.id] = {
              currentOccupancy: Math.max(0, eventsData.filter(e => e.event_type.includes('enter')).length - eventsData.filter(e => e.event_type.includes('exit')).length),
              countIn: eventsData.filter(e => e.event_type.includes('enter')).length,
              countOut: eventsData.filter(e => e.event_type.includes('exit')).length,
              avgDwellTime: 0,
              alertsToday: eventsData.filter(e => e.event_type.includes('alert')).length,
              lastEvent: eventsData[0]?.timestamp,
            };
          }
        } catch {}
      }
      setZoneStats(statsMap);
    } catch { toast.error('Erro ao carregar dados'); } finally { setLoading(false); }
  }, []);

  const loadZoneEvents = async (zoneId: string) => {
    try {
      const { data } = await supabase.from('zone_events').select('*').eq('zone_id', zoneId).order('created_at', { ascending: false }).limit(50);
      setZoneEvents(prev => ({ ...prev, [zoneId]: data || [] }));
    } catch {}
  };

  useEffect(() => { loadZones(); }, [loadZones]);

  const filteredZones = useMemo(() => zones.filter(zone => {
    if (searchQuery && !zone.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCameraFilter !== 'all' && zone.camera_id !== selectedCameraFilter) return false;
    if (selectedTypeFilter !== 'all' && zone.type !== selectedTypeFilter) return false;
    return true;
  }), [zones, searchQuery, selectedCameraFilter, selectedTypeFilter]);

  const stats = useMemo(() => ({
    total: zones.length, active: zones.filter(z => z.is_active).length,
    restricted: zones.filter(z => z.type === 'restricted').length,
    counting: zones.filter(z => z.type === 'counting' || z.type === 'tripwire').length,
  }), [zones]);

  const handleSave = async (data: TablesInsert<'zones'> | TablesUpdate<'zones'>) => {
    if (editingZone) { const { error } = await supabase.from('zones').update(data as TablesUpdate<'zones'>).eq('id', editingZone.id); if (error) throw error; }
    else { const { error } = await supabase.from('zones').insert(data as TablesInsert<'zones'>); if (error) throw error; }
    loadZones();
  };

  const handleDelete = async (zone: DbZoneLocal) => {
    try { const { error } = await supabase.from('zones').delete().eq('id', zone.id); if (error) throw error; toast.success('Zona excluída'); loadZones(); setDeleteConfirm(null); }
    catch { toast.error('Erro ao excluir'); }
  };

  const handleToggle = async (zone: DbZoneLocal) => {
    try { const { error } = await supabase.from('zones').update({ is_active: !zone.is_active }).eq('id', zone.id); if (error) throw error; toast.success(zone.is_active ? 'Zona desativada' : 'Zona ativada'); loadZones(); }
    catch { toast.error('Erro ao alternar'); }
  };

  const openEditor = (camera: { id: string; name: string; stream_url?: string | null; stream_protocol?: string; thumbnail?: string | null } | undefined, zone?: DbZoneLocal) => { if (!camera) return; setEditorCamera(camera); setEditingZone(zone || null); setIsEditorOpen(true); };
  const openView = (zone: DbZoneLocal) => { setViewingZone(zone); loadZoneEvents(zone.id); };
  const getCameraName = (cameraId: string | null) => (!cameraId ? 'Câmera desconhecida' : cameras.find(c => c.id === cameraId)?.name || 'Câmera desconhecida');
  const getCameraById = (cameraId: string | null) => (!cameraId ? null : cameras.find(c => c.id === cameraId));

  if (loading) {
    return (
      <div className="min-h-screen bg-background mb-mobile-nav">
        <PageMeta title="Zonas" description="Configure zonas de detecção e monitoramento" />
        <ZonesSkeleton />
      </div>
    );
  }

  const hasActiveFilters = searchQuery || selectedCameraFilter !== 'all' || selectedTypeFilter !== 'all';

  return (
    <div role="main" aria-label="Zonas de interesse" className="min-h-screen bg-background mb-mobile-nav">
      <PageMeta title="Zonas" description="Configure zonas de detecção e monitoramento" />

      {/* Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                <Target className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Zonas de Interesse</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">{stats.total} zonas • {stats.active} ativas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={loadZones} className="border-border/40">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button><Plus className="w-4 h-4 mr-2" />Nova Zona<ChevronDown className="w-4 h-4 ml-2" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {cameras.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground text-center">Nenhuma câmera disponível</div>
                  ) : cameras.map(camera => (
                    <DropdownMenuItem key={camera.id} onClick={() => openEditor(camera)}>
                      <Camera className="w-4 h-4 mr-2" />{camera.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-success/10 border border-success/20 flex items-center justify-center">
                    <Activity className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-success">{stats.active}</p>
                    <p className="text-xs text-muted-foreground">Ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-destructive">{stats.restricted}</p>
                    <p className="text-xs text-muted-foreground">Restritas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.counting}</p>
                    <p className="text-xs text-muted-foreground">Contagem</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar zonas..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 border-border/40 bg-card/60" />
            {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></Button>}
          </div>
          <Select value={selectedCameraFilter} onValueChange={setSelectedCameraFilter}>
            <SelectTrigger className="w-[180px] border-border/40 bg-card/60"><Camera className="w-4 h-4 mr-2" /><SelectValue placeholder="Câmera" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas câmeras</SelectItem>{cameras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
            <SelectTrigger className="w-[180px] border-border/40 bg-card/60"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todos tipos</SelectItem>{Object.entries(zoneTypeConfig).map(([key, config]) => <SelectItem key={key} value={key}>{config.label}</SelectItem>)}</SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setSelectedCameraFilter('all'); setSelectedTypeFilter('all'); }}>
              <X className="w-4 h-4 mr-1" />Limpar
            </Button>
          )}
          <div className="flex items-center border border-border/40 rounded-lg p-1 ml-auto bg-card/60">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        <div className="text-sm text-muted-foreground">{filteredZones.length} zonas encontradas</div>

        {filteredZones.length === 0 ? (
          <EmptyState icon={<Target />} title={zones.length === 0 ? 'Nenhuma zona configurada' : 'Nenhuma zona encontrada'}
            description={zones.length === 0 ? 'Crie zonas de interesse nas suas câmeras.' : 'Nenhuma zona corresponde aos filtros.'}
            action={zones.length === 0 && cameras.length > 0 ? { label: '+ Criar Zona', onClick: () => openEditor(cameras[0]) } : undefined}
          />
        ) : (
          <div className={cn(viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-2')}>
            {filteredZones.map(zone => (
              <ZoneCard key={zone.id} zone={zone} stats={zoneStats[zone.id]} cameraName={getCameraName(zone.camera_id)} onView={() => openView(zone)} onEdit={() => openEditor(getCameraById(zone.camera_id) ?? undefined, zone)} onDelete={() => setDeleteConfirm(zone)} onToggle={() => handleToggle(zone)} />
            ))}
          </div>
        )}
      </div>

      <ZoneEditorSheet isOpen={isEditorOpen} onClose={() => { setIsEditorOpen(false); setEditingZone(null); setEditorCamera(null); }} camera={editorCamera} zone={editingZone} onSave={handleSave} />
      <ZoneViewDialog zone={viewingZone} camera={viewingZone ? getCameraById(viewingZone.camera_id) ?? null : null} stats={viewingZone ? zoneStats[viewingZone.id] : undefined} events={viewingZone ? zoneEvents[viewingZone.id] || [] : []} isOpen={!!viewingZone} onClose={() => setViewingZone(null)} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Tem certeza que deseja excluir a zona <strong>{deleteConfirm?.name}</strong>?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ZonesPage;
