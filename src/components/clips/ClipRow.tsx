import { memo } from 'react';
import {
  Play, Download, Trash2, Star, StarOff,
  Film, Clock, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { VideoClip, formatDuration, formatFileSize } from '@/types/clips';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { triggerIcons, triggerLabels, triggerColors } from './clipConstants';

export interface ClipRowProps {
  clip: VideoClip;
  selected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onPlay?: (clip: VideoClip) => void;
  onDownload?: (clip: VideoClip) => void;
  onDelete?: (clipId: string) => void;
  onToggleFavorite?: (clipId: string) => void;
}

function ClipRowBase({
  clip, selected, onSelect, onPlay, onDownload, onDelete, onToggleFavorite,
}: ClipRowProps) {
  const TriggerIcon = triggerIcons[clip.trigger];

  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-accent/50',
      selected && 'bg-accent',
      !clip.isViewed && 'border-l-2 border-primary'
    )}>
      <Checkbox checked={selected} onCheckedChange={(checked) => onSelect(clip.id, !!checked)} />
      <div
        className="w-24 h-14 bg-secondary rounded overflow-hidden flex-shrink-0 cursor-pointer relative group"
        onClick={() => onPlay?.(clip)}
      >
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-6 h-6 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{clip.cameraName}</span>
          {clip.isFavorite && <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />}
          {!clip.isViewed && <Badge variant="secondary" className="text-xs">Novo</Badge>}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
          <Badge className={cn('text-white border-0 text-xs px-1.5 py-0', triggerColors[clip.trigger])}>
            <TriggerIcon className="w-3 h-3 mr-1" />{triggerLabels[clip.trigger]}
          </Badge>
          <span>{format(clip.startedAt, 'dd/MM/yy HH:mm', { locale: ptBR })}</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(clip.duration)}</span>
        <span className="flex items-center gap-1"><Film className="w-4 h-4" />{clip.frameCount}</span>
        {clip.fileSize && <span className="w-16 text-right">{formatFileSize(clip.fileSize)}</span>}
      </div>
      <div className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onPlay?.(clip)}><Play className="w-4 h-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Reproduzir</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onDownload?.(clip)}><Download className="w-4 h-4" /></Button>
            </TooltipTrigger>
            <TooltipContent>Baixar</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onToggleFavorite?.(clip.id)}>
                {clip.isFavorite ? <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" /> : <StarOff className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{clip.isFavorite ? 'Remover favorito' : 'Favoritar'}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={() => onDelete?.(clip.id)} className="text-destructive hover:text-destructive">
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

export const ClipRow = memo(ClipRowBase);
