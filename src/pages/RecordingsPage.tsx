/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Gravações / Clips
 * 
 * Funcionalidades:
 * - Lista de clips gravados
 * - Filtros por câmera, data, evento
 * - Player de clips
 * - Download e exclusão
 * - Timeline visual
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Video,
  Play,
  Pause,
  Download,
  Trash2,
  Search,
  Filter,
  Calendar,
  Camera,
  Clock,
  HardDrive,
  LayoutGrid,
  List,
  RefreshCw,
  MoreHorizontal,
  X,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize2,
  AlertTriangle,
  Tag,
  Eye,
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow, startOfDay, endOfDay, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type TriggerType = 'manual' | 'rule' | 'motion' | 'alert' | 'scheduled';

interface VideoClip {
  id: string;
  camera_id: string;
  camera_name: string;
  start_time: string;
  end_time: string;
  duration: number;
  file_url: string;
  thumbnail_url?: string;
  file_size: number;
  trigger_type: TriggerType;
  trigger_rule_id?: string;
  trigger_rule_name?: string;
  alert_id?: string;
  tags?: string[];
  notes?: string;
  created_at: string;
}

type ViewMode = 'grid' | 'list' | 'timeline';
type DateFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

// ============================================
// CONFIGURAÇÃO
// ============================================

const triggerTypeConfig: Record<TriggerType, { label: string; color: string }> = {
  manual: { label: 'Manual', color: 'text-blue-500' },
  rule: { label: 'Regra', color: 'text-purple-500' },
  motion: { label: 'Movimento', color: 'text-orange-500' },
  alert: { label: 'Alerta', color: 'text-red-500' },
  scheduled: { label: 'Agendado', color: 'text-green-500' },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins > 0) {
    return `${mins}m ${secs}s`;
  }
  return `${secs}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// ============================================
// COMPONENTE: Clip Card
// ============================================

interface ClipCardProps {
  clip: VideoClip;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

function ClipCard({ clip, isSelected, onSelect, onPlay, onDownload, onDelete }: ClipCardProps) {
  const triggerConfig = triggerTypeConfig[clip.trigger_type];

  return (
    <Card className={cn(
      'overflow-hidden transition-all hover:shadow-md group',
      isSelected && 'ring-2 ring-primary'
    )}>
      {/* Thumbnail */}
      <div className="relative aspect-video bg-black cursor-pointer" onClick={onPlay}>
        {clip.thumbnail_url ? (
          <img 
            src={clip.thumbnail_url} 
            alt={`Clip ${clip.id}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Video className="w-12 h-12 text-muted-foreground" />
          </div>
        )}

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
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

        {/* Trigger type */}
        <Badge 
          variant="secondary" 
          className={cn('absolute top-2 right-2 text-xs', triggerConfig.color)}
        >
          {triggerConfig.label}
        </Badge>
      </div>

      {/* Info */}
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm flex items-center gap-1">
              <Camera className="w-3 h-3 text-muted-foreground" />
              {clip.camera_name}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(clip.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formatFileSize(clip.file_size)}</span>
              {clip.tags && clip.tags.length > 0 && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {clip.tags.length}
                  </span>
                </>
              )}
            </div>
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
  clip: VideoClip | null;
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

  const triggerConfig = triggerTypeConfig[clip.trigger_type];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {clip.camera_name}
              <Badge variant="secondary" className={cn('ml-2 text-xs', triggerConfig.color)}>
                {triggerConfig.label}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {format(new Date(clip.start_time), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
              {' • '}
              {formatDuration(clip.duration)}
              {' • '}
              {formatFileSize(clip.file_size)}
            </DialogDescription>
          </DialogHeader>

          {/* Video */}
          <div className="relative aspect-video bg-black mt-4">
            <video
              src={clip.file_url}
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
          <div className="p-4 space-y-2">
            {/* Progress bar */}
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              className="cursor-pointer"
            />

            {/* Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
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

              <div className="flex items-center gap-2">
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
  // Estado
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [cameraFilter, setCameraFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('week');
  const [triggerFilter, setTriggerFilter] = useState<string>('all');
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [playingClip, setPlayingClip] = useState<VideoClip | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<VideoClip | null>(null);
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

      // Trigger filter
      if (triggerFilter !== 'all') {
        query = query.eq('trigger_type', triggerFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedClips: VideoClip[] = (data || []).map(clip => ({
        ...clip,
        camera_name: clip.cameras?.name || 'Câmera desconhecida',
      }));

      setClips(formattedClips);
    } catch (error) {
      console.error('Erro ao carregar clips:', error);
      toast.error('Erro ao carregar gravações');
    } finally {
      setLoading(false);
    }
  }, [cameraFilter, dateFilter, triggerFilter]);

  useEffect(() => {
    loadClips();
  }, [loadClips]);

  // Filtrar por busca
  const filteredClips = useMemo(() => {
    if (!searchQuery) return clips;
    
    const query = searchQuery.toLowerCase();
    return clips.filter(clip =>
      clip.camera_name.toLowerCase().includes(query) ||
      clip.tags?.some(tag => tag.toLowerCase().includes(query)) ||
      clip.notes?.toLowerCase().includes(query)
    );
  }, [clips, searchQuery]);

  // Paginação
  const totalPages = Math.ceil(filteredClips.length / itemsPerPage);
  const paginatedClips = filteredClips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats
  const stats = useMemo(() => ({
    total: clips.length,
    totalSize: clips.reduce((sum, c) => sum + c.file_size, 0),
    totalDuration: clips.reduce((sum, c) => sum + c.duration, 0),
    byTrigger: Object.fromEntries(
      Object.keys(triggerTypeConfig).map(type => [
        type,
        clips.filter(c => c.trigger_type === type).length
      ])
    ),
  }), [clips]);

  // Handlers
  const toggleSelectAll = () => {
    if (selectedClips.size === filteredClips.length) {
      setSelectedClips(new Set());
    } else {
      setSelectedClips(new Set(filteredClips.map(c => c.id)));
    }
  };

  const handleDelete = async (clip: VideoClip) => {
    try {
      const { error } = await supabase
        .from('video_clips')
        .delete()
        .eq('id', clip.id);

      if (error) throw error;

      toast.success('Clip excluído');
      loadClips();
      setDeleteConfirm(null);
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  const handleBulkDelete = async () => {
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
      toast.error('Erro ao excluir');
    }
  };

  const handleDownload = (clip: VideoClip) => {
    const a = document.createElement('a');
    a.href = clip.file_url;
    a.download = `${clip.camera_name}_${format(new Date(clip.start_time), 'yyyy-MM-dd_HH-mm-ss')}.webm`;
    a.click();
    toast.success('Download iniciado');
  };

  // Navigation in player
  const currentIndex = playingClip
    ? filteredClips.findIndex(c => c.id === playingClip.id)
    : -1;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="aspect-video" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6" />
            Gravações
          </h1>
          <p className="text-sm text-muted-foreground">
            {stats.total} clips • {formatFileSize(stats.totalSize)} • {formatDuration(stats.totalDuration)} total
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadClips}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Video className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Armazenamento</p>
                <p className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Manual</p>
                <p className="text-2xl font-bold text-blue-500">{stats.byTrigger.manual || 0}</p>
              </div>
              <Play className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Por Regra</p>
                <p className="text-2xl font-bold text-purple-500">{stats.byTrigger.rule || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Por Alerta</p>
                <p className="text-2xl font-bold text-red-500">{stats.byTrigger.alert || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar gravações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={cameraFilter} onValueChange={setCameraFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Câmera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas câmeras</SelectItem>
            {cameras.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="week">7 dias</SelectItem>
            <SelectItem value="month">30 dias</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={triggerFilter} onValueChange={setTriggerFilter}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos tipos</SelectItem>
            {Object.entries(triggerTypeConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View Mode */}
        <div className="flex items-center gap-1 border rounded-lg p-1 ml-auto">
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

      {/* Bulk actions */}
      {selectedClips.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
          <Checkbox
            checked={selectedClips.size === filteredClips.length}
            onCheckedChange={toggleSelectAll}
          />
          <span className="text-sm font-medium">{selectedClips.size} selecionados</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="text-sm text-muted-foreground">
        {filteredClips.length} gravações
      </div>

      {/* Clips Grid */}
      {filteredClips.length === 0 ? (
        <div className="text-center py-12">
          <Video className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Nenhuma gravação encontrada</h3>
          <p className="text-sm text-muted-foreground">
            As gravações aparecerão aqui quando você gravar clips das câmeras
          </p>
        </div>
      ) : (
        <div className={cn(
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-2'
        )}>
          {paginatedClips.map(clip => (
            <ClipCard
              key={clip.id}
              clip={clip}
              isSelected={selectedClips.has(clip.id)}
              onSelect={(selected) => {
                const next = new Set(selectedClips);
                if (selected) {
                  next.add(clip.id);
                } else {
                  next.delete(clip.id);
                }
                setSelectedClips(next);
              }}
              onPlay={() => setPlayingClip(clip)}
              onDownload={() => handleDownload(clip)}
              onDelete={() => setDeleteConfirm(clip)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Video Player */}
      <VideoPlayerDialog
        clip={playingClip}
        isOpen={!!playingClip}
        onClose={() => setPlayingClip(null)}
        onPrev={() => {
          if (currentIndex > 0) {
            setPlayingClip(filteredClips[currentIndex - 1]);
          }
        }}
        onNext={() => {
          if (currentIndex < filteredClips.length - 1) {
            setPlayingClip(filteredClips[currentIndex + 1]);
          }
        }}
        hasPrev={currentIndex > 0}
        hasNext={currentIndex < filteredClips.length - 1}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este clip de {deleteConfirm?.camera_name}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
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
