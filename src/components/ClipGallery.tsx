/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ClipGallery
 * 
 * Galeria para visualizar, filtrar e gerenciar clips gravados.
 */

import { useState, useMemo } from 'react';
import {
  Video,
  Play,
  Pause,
  Download,
  Trash2,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Filter,
  Search,
  Calendar,
  Clock,
  Film,
  Camera,
  AlertTriangle,
  Zap,
  Hand,
  MoreVertical,
  Grid,
  List,
  SortAsc,
  SortDesc,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  VideoClip,
  RecordingTrigger,
  ClipFilters,
  formatDuration,
  formatFileSize,
} from '@/types/clips';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ============================================
// TIPOS
// ============================================

interface ClipGalleryProps {
  /** Lista de clips */
  clips: VideoClip[];
  
  /** Callbacks */
  onPlay?: (clip: VideoClip) => void;
  onDownload?: (clip: VideoClip) => void;
  onDelete?: (clipId: string) => void;
  onToggleFavorite?: (clipId: string) => void;
  onMarkViewed?: (clipId: string) => void;
  
  /** Layout inicial */
  defaultLayout?: 'grid' | 'list';
  
  /** Mostrar filtros */
  showFilters?: boolean;
  
  /** Altura máxima */
  maxHeight?: number | string;
  
  /** Classe CSS */
  className?: string;
}

// ============================================
// TRIGGER ICONS
// ============================================

const triggerIcons: Record<RecordingTrigger, React.ElementType> = {
  manual: Hand,
  alert: AlertTriangle,
  motion: Eye,
  schedule: Calendar,
  rule: Zap,
  api: Video,
};

const triggerLabels: Record<RecordingTrigger, string> = {
  manual: 'Manual',
  alert: 'Alerta',
  motion: 'Movimento',
  schedule: 'Agendado',
  rule: 'Regra',
  api: 'API',
};

const triggerColors: Record<RecordingTrigger, string> = {
  manual: 'bg-blue-500',
  alert: 'bg-yellow-500',
  motion: 'bg-purple-500',
  schedule: 'bg-green-500',
  rule: 'bg-orange-500',
  api: 'bg-cyan-500',
};

// ============================================
// CLIP CARD (Grid)
// ============================================

function ClipCard({
  clip,
  onPlay,
  onDownload,
  onDelete,
  onToggleFavorite,
  onMarkViewed,
}: {
  clip: VideoClip;
  onPlay?: (clip: VideoClip) => void;
  onDownload?: (clip: VideoClip) => void;
  onDelete?: (clipId: string) => void;
  onToggleFavorite?: (clipId: string) => void;
  onMarkViewed?: (clipId: string) => void;
}) {
  const TriggerIcon = triggerIcons[clip.trigger];

  return (
    <Card className="group overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-secondary">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={`Clip ${clip.cameraName}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Overlay com play */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button
            variant="secondary"
            size="icon"
            className="w-12 h-12 rounded-full"
            onClick={() => onPlay?.(clip)}
          >
            <Play className="w-6 h-6" />
          </Button>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge className={cn('text-white border-0 text-xs', triggerColors[clip.trigger])}>
            <TriggerIcon className="w-3 h-3 mr-1" />
            {triggerLabels[clip.trigger]}
          </Badge>
        </div>

        {/* Duração */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {formatDuration(clip.duration)}
        </div>

        {/* Favorito */}
        {clip.isFavorite && (
          <div className="absolute top-2 right-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        )}

        {/* Não visualizado */}
        {!clip.isViewed && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs">Novo</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-sm truncate">{clip.cameraName}</h4>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(clip.startedAt, { addSuffix: true, locale: ptBR })}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onPlay?.(clip)}>
                <Play className="w-4 h-4 mr-2" />
                Reproduzir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.(clip)}>
                <Download className="w-4 h-4 mr-2" />
                Baixar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFavorite?.(clip.id)}>
                {clip.isFavorite ? (
                  <>
                    <StarOff className="w-4 h-4 mr-2" />
                    Remover favorito
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    Favoritar
                  </>
                )}
              </DropdownMenuItem>
              {!clip.isViewed && (
                <DropdownMenuItem onClick={() => onMarkViewed?.(clip.id)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Marcar como visto
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete?.(clip.id)}
                className="text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Film className="w-3 h-3" />
            {clip.frameCount}
          </span>
          {clip.fileSize && (
            <span>{formatFileSize(clip.fileSize)}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// CLIP ROW (List)
// ============================================

function ClipRow({
  clip,
  selected,
  onSelect,
  onPlay,
  onDownload,
  onDelete,
  onToggleFavorite,
}: {
  clip: VideoClip;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onPlay?: (clip: VideoClip) => void;
  onDownload?: (clip: VideoClip) => void;
  onDelete?: (clipId: string) => void;
  onToggleFavorite?: (clipId: string) => void;
}) {
  const TriggerIcon = triggerIcons[clip.trigger];

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-accent/50',
        selected && 'bg-accent',
        !clip.isViewed && 'border-l-2 border-primary'
      )}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(checked) => onSelect(clip.id, !!checked)}
      />

      {/* Thumbnail */}
      <div
        className="w-24 h-14 bg-secondary rounded overflow-hidden flex-shrink-0 cursor-pointer relative group"
        onClick={() => onPlay?.(clip)}
      >
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{clip.cameraName}</span>
          {clip.isFavorite && (
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
          )}
          {!clip.isViewed && (
            <Badge variant="secondary" className="text-xs">Novo</Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <Badge className={cn('text-white border-0 text-xs px-1.5 py-0', triggerColors[clip.trigger])}>
            <TriggerIcon className="w-3 h-3 mr-1" />
            {triggerLabels[clip.trigger]}
          </Badge>
          <span>{format(clip.startedAt, 'dd/MM/yy HH:mm', { locale: ptBR })}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {formatDuration(clip.duration)}
        </span>
        <span className="flex items-center gap-1">
          <Film className="w-4 h-4" />
          {clip.frameCount}
        </span>
        {clip.fileSize && (
          <span className="w-16 text-right">{formatFileSize(clip.fileSize)}</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onPlay?.(clip)}>
                <Play className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reproduzir</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onDownload?.(clip)}>
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Baixar</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onToggleFavorite?.(clip.id)}>
                {clip.isFavorite ? (
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{clip.isFavorite ? 'Remover favorito' : 'Favoritar'}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete?.(clip.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Excluir</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// ============================================
// VIDEO PLAYER MODAL
// ============================================

function VideoPlayerModal({
  clip,
  open,
  onClose,
}: {
  clip: VideoClip | null;
  open: boolean;
  onClose: () => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  if (!clip) return null;

  const videoUrl = clip.localUrl || clip.fileUrl;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {clip.cameraName}
            <Badge className={cn('ml-2 text-white border-0', triggerColors[clip.trigger])}>
              {triggerLabels[clip.trigger]}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-video">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              className="w-full h-full"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p>Vídeo não disponível</p>
            </div>
          )}
        </div>

        <div className="p-4 pt-2 bg-card border-t">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4 text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {format(clip.startedAt, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(clip.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Film className="w-4 h-4" />
                {clip.frameCount} frames
              </span>
              {clip.fileSize && (
                <span>{formatFileSize(clip.fileSize)}</span>
              )}
            </div>
          </div>

          {clip.triggerDetails?.message && (
            <p className="mt-2 text-sm text-muted-foreground">
              {clip.triggerDetails.message}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function ClipGallery({
  clips,
  onPlay,
  onDownload,
  onDelete,
  onToggleFavorite,
  onMarkViewed,
  defaultLayout = 'grid',
  showFilters = true,
  maxHeight,
  className,
}: ClipGalleryProps) {
  // Estado
  const [layout, setLayout] = useState<'grid' | 'list'>(defaultLayout);
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState<RecordingTrigger | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUnviewedOnly, setShowUnviewedOnly] = useState(false);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [playerClip, setPlayerClip] = useState<VideoClip | null>(null);

  // Filtrar e ordenar clips
  const filteredClips = useMemo(() => {
    let result = [...clips];

    // Filtro de busca
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        c =>
          c.cameraName.toLowerCase().includes(searchLower) ||
          c.notes?.toLowerCase().includes(searchLower) ||
          c.tags?.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    // Filtro de trigger
    if (triggerFilter !== 'all') {
      result = result.filter(c => c.trigger === triggerFilter);
    }

    // Filtro de favoritos
    if (showFavoritesOnly) {
      result = result.filter(c => c.isFavorite);
    }

    // Filtro de não visualizados
    if (showUnviewedOnly) {
      result = result.filter(c => !c.isViewed);
    }

    // Ordenação
    result.sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        comparison = a.startedAt.getTime() - b.startedAt.getTime();
      } else if (sortBy === 'duration') {
        comparison = a.duration - b.duration;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [clips, search, triggerFilter, showFavoritesOnly, showUnviewedOnly, sortBy, sortOrder]);

  const handleSelectClip = (id: string, selected: boolean) => {
    setSelectedClips(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedClips.size === filteredClips.length) {
      setSelectedClips(new Set());
    } else {
      setSelectedClips(new Set(filteredClips.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    selectedClips.forEach(id => onDelete?.(id));
    setSelectedClips(new Set());
  };

  const handlePlayClip = (clip: VideoClip) => {
    setPlayerClip(clip);
    onPlay?.(clip);
    if (!clip.isViewed) {
      onMarkViewed?.(clip.id);
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filtros */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar clips..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
            {search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearch('')}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          {/* Filtro de trigger */}
          <Select value={triggerFilter} onValueChange={(v: any) => setTriggerFilter(v)}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="alert">Alerta</SelectItem>
              <SelectItem value="rule">Regra</SelectItem>
              <SelectItem value="motion">Movimento</SelectItem>
              <SelectItem value="schedule">Agendado</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordenação */}
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Data</SelectItem>
              <SelectItem value="duration">Duração</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? (
              <SortAsc className="w-4 h-4" />
            ) : (
              <SortDesc className="w-4 h-4" />
            )}
          </Button>

          {/* Toggle favoritos */}
          <Button
            variant={showFavoritesOnly ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={cn('w-4 h-4', showFavoritesOnly && 'fill-yellow-400 text-yellow-400')} />
          </Button>

          {/* Toggle não vistos */}
          <Button
            variant={showUnviewedOnly ? 'secondary' : 'outline'}
            size="icon"
            onClick={() => setShowUnviewedOnly(!showUnviewedOnly)}
          >
            <Eye className="w-4 h-4" />
          </Button>

          {/* Layout */}
          <div className="flex border rounded-lg">
            <Button
              variant={layout === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-r-none"
              onClick={() => setLayout('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={layout === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="rounded-l-none"
              onClick={() => setLayout('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Ações em lote */}
      {selectedClips.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
          <Checkbox
            checked={selectedClips.size === filteredClips.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm">{selectedClips.size} selecionado(s)</span>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir selecionados
          </Button>
        </div>
      )}

      {/* Lista de clips */}
      <ScrollArea style={{ maxHeight: maxHeight || 'auto' }}>
        {filteredClips.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">
              {clips.length === 0 ? 'Nenhum clip gravado' : 'Nenhum clip encontrado'}
            </p>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredClips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                onPlay={handlePlayClip}
                onDownload={onDownload}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
                onMarkViewed={onMarkViewed}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClips.map((clip) => (
              <ClipRow
                key={clip.id}
                clip={clip}
                selected={selectedClips.has(clip.id)}
                onSelect={handleSelectClip}
                onPlay={handlePlayClip}
                onDownload={onDownload}
                onDelete={onDelete}
                onToggleFavorite={onToggleFavorite}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Player Modal */}
      <VideoPlayerModal
        clip={playerClip}
        open={!!playerClip}
        onClose={() => setPlayerClip(null)}
      />
    </div>
  );
}

export default ClipGallery;
