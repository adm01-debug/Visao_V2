import { formatDate, formatNumber } from "@/lib/formatters";
import { EmptyState, ErrorState, LoadingSpinner, TimeAgo } from "@/components";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Gravações / Clips
 * 
 * Funcionalidades:
 * - Lista de clips gravados
 * - Filtros por câmera, data
 * - Player de clips
 * - Download e exclusão
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useI18n } from '@/contexts/i18n';
import {
  Video,
  Play,
  Pause,
  Download,
  Trash2,
  Search,
  Calendar,
  Camera,
  Clock,
  LayoutGrid,
  List,
  RefreshCw,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, startOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';
import { ClipGallery } from '@/components/ClipGallery';

// ============================================
// TIPOS - Alinhados com schema do banco
// ============================================

type DbVideoClip = Tables<'video_clips'>;

interface VideoClipWithCamera extends DbVideoClip {
  camera_name: string;
}

type ViewMode = 'grid' | 'list';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds: number | null): string {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

// ============================================
// COMPONENTE: Clip Card
// ============================================

interface ClipCardProps {
  clip: VideoClipWithCamera;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function ClipCard({ clip, isSelected, onSelect, onPlay, onDownload, onDelete }: ClipCardProps) {
  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:shadow-md group',
      isSelected && 'ring-2 ring-primary'
    )}>
      {/* Thumbnail */}
      <div role="main" aria-label="Gravações" className="relative aspect-video bg-black cursor-pointer" onClick={onPlay}>
        {clip.thumbnail_url ? (
          <img 
            src={clip.thumbnail_url} 
            alt={`Clip ${clip.id}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div role="main" aria-label="Gravações" className="w-full h-full flex items-center justify-center bg-muted">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Play overlay */}
        <div role="main" aria-label="Gravações" className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div role="main" aria-label="Gravações" className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
            <Play className="w-6 h-6 text-black ml-1" />
          </div>
        </div>

        {/* Duration badge */}
        <Badge className="absolute bottom-2 right-2 bg-black/70 text-white">
          {formatDuration(clip.duration)}
        </Badge>

        {/* Checkbox */}
        <div 
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox 
            checked={isSelected}
            onCheckedChange={onSelect}
            className="bg-white/80"
          />
        </div>

        {/* Status */}
        <Badge 
          variant="secondary" 
          className="absolute top-2 right-2 text-xs"
        >
          {clip.status}
        </Badge>
      </div>

      {/* Info */}
      <CardContent className="p-3">
        <div role="main" className="flex items-start justify-between gap-2">
          <div role="main" aria-label="Gravações" className="min-w-0 flex-1">
            <p className="font-medium text-sm flex items-center gap-1">
              <Camera className="w-3 h-3 text-muted-foreground" />
              {clip.camera_name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(clip.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPlay}>
                <Play className="w-4 h-4 mr-2" />
                Reproduzir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// COMPONENTE: Video Player Dialog
// ============================================

interface VideoPlayerDialogProps {
  clip: VideoClipWithCamera | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

function VideoPlayerDialog({
  clip,
  isOpen,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: VideoPlayerDialogProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!clip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div role="main" className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {clip.camera_name}
            </DialogTitle>
            <DialogDescription>
              {format(new Date(clip.start_time), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
              {' • '}
              {formatDuration(clip.duration)}
            </DialogDescription>
          </DialogHeader>

          {/* Video */}
          <div role="main" aria-label="Gravações" className="relative aspect-video bg-black mt-4">
            <video
              src={clip.file_url || undefined}
              className="w-full h-full"
              autoPlay={isPlaying}
              muted={isMuted}
              controls={false}
              onTimeUpdate={(e) => {
                const video = e.target as HTMLVideoElement;
                setProgress((video.currentTime / video.duration) * 100);
              }}
            />

            {/* Navigation */}
            {hasPrev && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                onClick={onPrev}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            {hasNext && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/70"
                onClick={onNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Controls */}
          <div role="main" aria-label="Gravações" className="p-4 space-y-2">
            {/* Progress bar */}
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />

            {/* Buttons */}
            <div role="main" className="flex items-center justify-between">
              <div role="main" className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </Button>
              </div>

              <div role="main" className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL: RecordingsPage
// ============================================

export function RecordingsPage() {
  const { t } = useI18n();
  
  // Estado
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

  // Hooks
  const { cameras } = useCameras();

  // Carregar clips
  const loadClips = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('video_clips')
        .select('*, cameras(name)')
        .order('start_time', { ascending: false });

      // Date filter
      const now = new Date();
      switch (dateFilter) {
        case 'today':
          query = query.gte('start_time', startOfDay(now).toISOString());
          break;
        case 'yesterday':
          query = query
            .gte('start_time', startOfDay(subDays(now, 1)).toISOString())
            .lt('start_time', startOfDay(now).toISOString());
          break;
        case 'week':
          query = query.gte('start_time', subDays(now, 7).toISOString());
          break;
        case 'month':
          query = query.gte('start_time', subDays(now, 30).toISOString());
          break;
      }

      // Camera filter
      if (cameraFilter !== 'all') {
        query = query.eq('camera_id', cameraFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedClips: VideoClipWithCamera[] = (data || []).map(clip => ({
        ...clip,
        camera_name: (clip.cameras as any)?.name || 'Câmera desconhecida',
      }));

      setClips(formattedClips);
    } catch (error) {
      
      toast.error('Erro ao carregar gravações');
    } finally {
      setLoading(false);
    }
  }, [cameraFilter, dateFilter]);

  useEffect(() => {
    loadClips();
  }, [loadClips]);

  // Filtrar por busca
  const filteredClips = useMemo(() => {
    if (!searchQuery) return clips;
    
    const query = searchQuery.toLowerCase();
    return clips.filter(clip =>
      clip.camera_name.toLowerCase().includes(query)
    );
  }, [clips, searchQuery]);

  // Paginação
  const totalPages = Math.ceil(filteredClips.length / itemsPerPage);
  const paginatedClips = filteredClips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSelectClip = (clipId: string, selected: boolean) => {
    setSelectedClips(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(clipId);
      } else {
        newSet.delete(clipId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedClips(new Set(paginatedClips.map(c => c.id)));
    } else {
      setSelectedClips(new Set());
    }
  };

  const handleDownloadClip = async (clip: VideoClipWithCamera) => {
    if (!clip.file_url) {
      toast.error('URL do arquivo não disponível');
      return;
    }

    const link = document.createElement('a');
    link.href = clip.file_url;
    link.download = `clip_${clip.id}.mp4`;
    link.click();
    toast.success('Download iniciado');
  };

  const handleDeleteClip = async () => {
    if (!deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('video_clips')
        .delete()
        .eq('id', deleteConfirm.id);

      if (error) throw error;

      toast.success('Clip excluído');
      loadClips();
    } catch (error) {
      
      toast.error('Erro ao excluir clip');
    } finally {
      setDeleteConfirm(null);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedClips.size === 0) return;

    try {
      const { error } = await supabase
        .from('video_clips')
        .delete()
        .in('id', Array.from(selectedClips));

      if (error) throw error;

      toast.success(`${selectedClips.size} clips excluídos`);
      setSelectedClips(new Set());
      loadClips();
    } catch (error) {
      
      toast.error('Erro ao excluir clips');
    }
  };

  // Navigate clips in player
  const handlePrevClip = () => {
    if (!playingClip) return;
    const idx = filteredClips.findIndex(c => c.id === playingClip.id);
    if (idx > 0) {
      setPlayingClip(filteredClips[idx - 1]);
    }
  };

  const handleNextClip = () => {
    if (!playingClip) return;
    const idx = filteredClips.findIndex(c => c.id === playingClip.id);
    if (idx < filteredClips.length - 1) {
      setPlayingClip(filteredClips[idx + 1]);
    }
  };

  // Stats
  const stats = useMemo(() => ({
    total: clips.length,
    totalDuration: clips.reduce((sum, c) => sum + (c.duration || 0), 0),
  }), [clips]);

  return (
    <div role="main" aria-label="Gravações" className="min-h-screen bg-background">
      {/* Header */}
      <div role="main" aria-label="Gravações" className="border-b bg-card">
        <div role="main" aria-label="Gravações" className="container py-6">
          <div role="main" className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Video className="w-6 h-6" />
                {t('recordings.title', 'Gravações')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('recordings.subtitle', 'Visualize e gerencie os clips de vídeo gravados')}
              </p>
            </div>

            <div role="main" className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={loadClips}
                disabled={loading}
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </Button>
              {selectedClips.size > 0 && (
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('recordings.delete', 'Excluir')} ({selectedClips.size})
                </Button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div role="main" aria-label="Gravações" className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div role="main" className="flex items-center gap-3">
                  <div role="main" aria-label="Gravações" className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total}</p>
                    <p className="text-xs text-muted-foreground"{t('recordings.clips', 'Clips')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div role="main" className="flex items-center gap-3">
                  <div role="main" aria-label="Gravações" className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{formatDuration(stats.totalDuration)}</p>
                    <p className="text-xs text-muted-foreground"{t('recordings.totalDuration', 'Duração total')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Content */}
      <div role="main" aria-label="Gravações" className="container py-6">
        {/* Filters */}
        <div role="main" className="flex flex-wrap items-center gap-4 mb-6">
          <div role="main" aria-label="Gravações" className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por câmera..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => setSearchQuery('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>

          <Select value={cameraFilter} onValueChange={setCameraFilter}>
            <SelectTrigger className="w-[180px]">
              <Camera className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Câmera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"{t('recordings.allCameras', 'Todas as câmeras')}</SelectItem>
              {cameras.map(cam => (
                <SelectItem key={cam.id} value={cam.id}>
                  {cam.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today"{t('recordings.today', 'Hoje')}</SelectItem>
              <SelectItem value="yesterday"{t('recordings.yesterday', 'Ontem')}</SelectItem>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mês</SelectItem>
              <SelectItem value="all"{t('recordings.all', 'Todos')}</SelectItem>
            </SelectContent>
          </Select>

          <div role="main" className="flex items-center border rounded-lg p-1 ml-auto">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Select all */}
        {paginatedClips.length > 0 && (
          <div role="main" className="flex items-center gap-2 mb-4">
            <Checkbox
              checked={selectedClips.size === paginatedClips.length}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm text-muted-foreground">
              Selecionar todos ({paginatedClips.length})
            </span>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className={cn(
            'gap-4',
            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'space-y-2'
          )}>
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className={viewMode === 'grid' ? 'aspect-video' : 'h-20'} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredClips.length === 0 && (
          <div role="main" aria-label="Gravações" className="text-center py-16">
            <Video className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-1"{t('recordings.noRecordings', 'Nenhuma gravação encontrada')}</h3>
            <p className="text-muted-foreground">
              Ajuste os filtros ou grave novos clips
            </p>
          </div>
        )}

        {/* Grid View */}
        {!loading && viewMode === 'grid' && paginatedClips.length > 0 && (
          <div role="main" aria-label="Gravações" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedClips.map(clip => (
              <ClipCard
                key={clip.id}
                clip={clip}
                isSelected={selectedClips.has(clip.id)}
                onSelect={(selected) => handleSelectClip(clip.id, selected)}
                onPlay={() => setPlayingClip(clip)}
                onDownload={() => handleDownloadClip(clip)}
                onDelete={() => setDeleteConfirm(clip)}
              />
            ))}
          </div>
        )}

        {/* List View */}
        {!loading && viewMode === 'list' && paginatedClips.length > 0 && (
          <div role="main" aria-label="Gravações" className="space-y-2">
            {paginatedClips.map(clip => (
              <Card key={clip.id} className={cn(
                'overflow-hidden transition-all hover:shadow-md cursor-pointer',
                selectedClips.has(clip.id) && 'ring-2 ring-primary'
              )}>
                <CardContent className="p-4 flex items-center gap-4">
                  <Checkbox
                    checked={selectedClips.has(clip.id)}
                    onCheckedChange={(checked) => handleSelectClip(clip.id, !!checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  
                  <div 
                    className="w-32 h-20 bg-muted rounded overflow-hidden flex-shrink-0 cursor-pointer"
                    onClick={() => setPlayingClip(clip)}
                  >
                    {clip.thumbnail_url ? (
                      <img 
                        src={clip.thumbnail_url} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div role="main" aria-label="Gravações" className="w-full h-full flex items-center justify-center">
                        <Video className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div role="main" className="flex-1 min-w-0">
                    <p className="font-medium flex items-center gap-2">
                      <Camera className="w-4 h-4 text-muted-foreground" />
                      {clip.camera_name}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(clip.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <div role="main" className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(clip.duration)}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {clip.status}
                      </Badge>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setPlayingClip(clip)}>
                        <Play className="w-4 h-4 mr-2" />
                        Reproduzir
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownloadClip(clip)}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(clip)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div role="main" className="flex items-center justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground px-4">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              Próxima
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Video Player Dialog */}
      <VideoPlayerDialog
        clip={playingClip}
        isOpen={!!playingClip}
        onClose={() => setPlayingClip(null)}
        onPrev={handlePrevClip}
        onNext={handleNextClip}
        hasPrev={playingClip ? filteredClips.findIndex(c => c.id === playingClip.id) > 0 : false}
        hasNext={playingClip ? filteredClips.findIndex(c => c.id === playingClip.id) < filteredClips.length - 1 : false}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle{t('recordings.confirmDelete', 'Confirmar exclusão')}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta gravação?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel{t('common.cancel', 'Cancelar')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClip}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default RecordingsPage;
