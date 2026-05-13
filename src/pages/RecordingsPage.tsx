/**
 * VISÃO - Página de Gravações - Design Premium
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Video, Search, Calendar, Camera, Clock, LayoutGrid, List, RefreshCw, X, ChevronLeft, ChevronRight, Trash2, Play, Download, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { cn } from '@/lib/utils';
import { format, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { ClipCard, formatClipDuration } from '@/components/recordings/ClipCard';
import { VideoPlayerDialog } from '@/components/recordings/VideoPlayerDialog';
import type { VideoClipWithCamera } from '@/components/recordings/ClipCard';

type ViewMode = 'grid' | 'list';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export function RecordingsPage() {
  const [clips, setClips] = useState<VideoClipWithCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraFilter, setCameraFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [playingClip, setPlayingClip] = useState<VideoClipWithCamera | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<VideoClipWithCamera | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  const { cameras } = useCameras();

  const loadClips = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from('video_clips').select('*, cameras(name)').order('start_time', { ascending: false });
      const now = new Date();
      if (dateFilter === 'today') query = query.gte('start_time', startOfDay(now).toISOString());
      else if (dateFilter === 'yesterday') query = query.gte('start_time', startOfDay(subDays(now, 1)).toISOString()).lt('start_time', startOfDay(now).toISOString());
      else if (dateFilter === 'week') query = query.gte('start_time', subDays(now, 7).toISOString());
      else if (dateFilter === 'month') query = query.gte('start_time', subDays(now, 30).toISOString());
      if (cameraFilter !== 'all') query = query.eq('camera_id', cameraFilter);
      const { data, error } = await query;
      if (error) throw error;
      setClips((data || []).map(clip => ({ ...clip, camera_name: (clip.cameras as { name?: string } | null)?.name || 'Câmera desconhecida' })));
    } catch { toast.error('Erro ao carregar gravações'); }
    finally { setLoading(false); }
  }, [cameraFilter, dateFilter]);

  useEffect(() => { loadClips(); }, [loadClips]);

  const filteredClips = useMemo(() => {
    if (!searchQuery) return clips;
    return clips.filter(c => c.camera_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [clips, searchQuery]);

  const totalPages = Math.ceil(filteredClips.length / itemsPerPage);
  const paginatedClips = filteredClips.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectClip = (id: string, sel: boolean) => setSelectedClips(p => { const s = new Set(p); sel ? s.add(id) : s.delete(id); return s; });
  const handleSelectAll = (sel: boolean) => setSelectedClips(sel ? new Set(paginatedClips.map(c => c.id)) : new Set());
  const handleDownloadClip = (clip: VideoClipWithCamera) => {
    if (!clip.file_url) { toast.error('URL não disponível'); return; }
    const a = document.createElement('a'); a.href = clip.file_url; a.download = `clip_${clip.id}.mp4`; a.click(); toast.success('Download iniciado');
  };
  const handleDeleteClip = async () => {
    if (!deleteConfirm) return;
    try { const { error } = await supabase.from('video_clips').delete().eq('id', deleteConfirm.id); if (error) throw error; toast.success('Clip excluído'); loadClips(); }
    catch { toast.error('Erro ao excluir clip'); } finally { setDeleteConfirm(null); }
  };
  const handleDeleteSelected = async () => {
    if (selectedClips.size === 0) return;
    try { const { error } = await supabase.from('video_clips').delete().in('id', Array.from(selectedClips)); if (error) throw error; toast.success(`${selectedClips.size} clips excluídos`); setSelectedClips(new Set()); loadClips(); }
    catch { toast.error('Erro ao excluir clips'); }
  };

  const playIdx = playingClip ? filteredClips.findIndex(c => c.id === playingClip.id) : -1;
  const stats = useMemo(() => ({ total: clips.length, totalDuration: clips.reduce((s, c) => s + (c.duration || 0), 0) }), [clips]);

  return (
    <div role="main" aria-label="Gravações" className="min-h-screen bg-background mb-mobile-nav">
      <PageMeta title="Gravações" description="Visualize e gerencie clips de vídeo gravados" />

      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                <Video className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Gravações</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">Visualize e gerencie os clips gravados</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={loadClips} disabled={loading} className="border-border/40">
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
              {selectedClips.size > 0 && (
                <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="bg-[hsl(var(--severity-critical))] hover:bg-[hsl(var(--severity-critical))]/90 text-destructive-foreground">
                  <Trash2 className="w-4 h-4 mr-2" />Excluir ({selectedClips.size})
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                    <p className="text-xs text-muted-foreground">Clips</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{formatClipDuration(stats.totalDuration)}</p>
                    <p className="text-xs text-muted-foreground">Duração total</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar por câmera..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 border-border/40 bg-card/60" />
            {searchQuery && <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6" onClick={() => setSearchQuery('')}><X className="w-3 h-3" /></Button>}
          </div>
          <Select value={cameraFilter} onValueChange={setCameraFilter}>
            <SelectTrigger className="w-[180px] border-border/40 bg-card/60"><Camera className="w-4 h-4 mr-2" /><SelectValue placeholder="Câmera" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Todas as câmeras</SelectItem>{cameras.map(cam => <SelectItem key={cam.id} value={cam.id}>{cam.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[150px] border-border/40 bg-card/60"><Calendar className="w-4 h-4 mr-2" /><SelectValue placeholder="Período" /></SelectTrigger>
            <SelectContent><SelectItem value="today">Hoje</SelectItem><SelectItem value="yesterday">Ontem</SelectItem><SelectItem value="week">Última semana</SelectItem><SelectItem value="month">Último mês</SelectItem><SelectItem value="all">Todos</SelectItem></SelectContent>
          </Select>
          <div className="flex items-center border border-border/40 rounded-lg p-1 ml-auto bg-card/60">
            <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('grid')}><LayoutGrid className="w-4 h-4" /></Button>
            <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setViewMode('list')}><List className="w-4 h-4" /></Button>
          </div>
        </div>

        {paginatedClips.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Checkbox checked={selectedClips.size === paginatedClips.length} onCheckedChange={handleSelectAll} />
            <span className="text-sm text-muted-foreground">Selecionar todos ({paginatedClips.length})</span>
          </div>
        )}

        {loading && <div className={cn('gap-4', viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-2')}>{[...Array(8)].map((_, i) => <Skeleton key={i} className={viewMode === 'grid' ? 'aspect-video rounded-xl' : 'h-20 rounded-xl'} />)}</div>}

        {!loading && filteredClips.length === 0 && (
          <div className="text-center py-16">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center mb-4">
              <Video className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Nenhuma gravação encontrada</h3>
            <p className="text-muted-foreground text-sm">Ajuste os filtros ou grave novos clips</p>
          </div>
        )}

        {!loading && viewMode === 'grid' && paginatedClips.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedClips.map(clip => <ClipCard key={clip.id} clip={clip} isSelected={selectedClips.has(clip.id)} onSelect={(s) => handleSelectClip(clip.id, s as boolean)} onPlay={() => setPlayingClip(clip)} onDownload={() => handleDownloadClip(clip)} onDelete={() => setDeleteConfirm(clip)} />)}
          </div>
        )}

        {!loading && viewMode === 'list' && paginatedClips.length > 0 && (
          <div className="space-y-2">
            {paginatedClips.map(clip => (
              <Card key={clip.id} className={cn('overflow-hidden transition-all hover:shadow-md cursor-pointer border-border/40', selectedClips.has(clip.id) && 'ring-2 ring-primary')}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Checkbox checked={selectedClips.has(clip.id)} onCheckedChange={(c) => handleSelectClip(clip.id, !!c)} onClick={(e) => e.stopPropagation()} />
                  <div className="w-32 h-20 bg-muted/50 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer border border-border/30" onClick={() => setPlayingClip(clip)}>
                    {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Video className="w-8 h-8 text-muted-foreground/40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground flex items-center gap-2"><Camera className="w-4 h-4 text-muted-foreground" />{clip.camera_name}</p>
                    <p className="text-sm text-muted-foreground mt-1">{format(new Date(clip.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatClipDuration(clip.duration)}</span>
                      <Badge variant="secondary" className="text-xs">{clip.status}</Badge>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPlayingClip(clip)}><Play className="w-4 h-4 mr-2" />Reproduzir</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadClip(clip)}><Download className="w-4 h-4 mr-2" />Download</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-[hsl(var(--severity-critical))]" onClick={() => setDeleteConfirm(clip)}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-6">
            <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="border-border/40"><ChevronLeft className="w-4 h-4 mr-1" />Anterior</Button>
            <span className="text-sm text-muted-foreground px-4">Página {currentPage} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="border-border/40">Próxima<ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        )}
      </div>

      <VideoPlayerDialog clip={playingClip} isOpen={!!playingClip} onClose={() => setPlayingClip(null)}
        onPrev={() => { if (playIdx > 0) setPlayingClip(filteredClips[playIdx - 1]!); }}
        onNext={() => { if (playIdx < filteredClips.length - 1) setPlayingClip(filteredClips[playIdx + 1]!); }}
        hasPrev={playIdx > 0} hasNext={playIdx < filteredClips.length - 1} />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta gravação? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClip} className="bg-[hsl(var(--severity-critical))] hover:bg-[hsl(var(--severity-critical))]/90 text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RecordingsPage;
