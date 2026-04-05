import { memo } from 'react';
import {
  Play, Download, Trash2, Star, StarOff, Eye,
  Film, MoreVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { VideoClip, formatDuration, formatFileSize } from '@/types/clips';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { triggerIcons, triggerLabels, triggerColors } from './clipConstants';

export interface ClipCardProps {
  clip: VideoClip;
  onPlay?: (clip: VideoClip) => void;
  onDownload?: (clip: VideoClip) => void;
  onDelete?: (clipId: string) => void;
  onToggleFavorite?: (clipId: string) => void;
  onMarkViewed?: (clipId: string) => void;
}

function ClipCardBase({
  clip, onPlay, onDownload, onDelete, onToggleFavorite, onMarkViewed,
}: ClipCardProps) {
  const TriggerIcon = clip.trigger ? triggerIcons[clip.trigger] : triggerIcons.manual;

  return (
    <Card className="group overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all">
      <div className="relative aspect-video bg-secondary">
        {clip.thumbnailUrl ? (
          <img src={clip.thumbnailUrl} alt={`Clip ${clip.cameraName}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="secondary" size="icon" className="w-12 h-12 rounded-full" onClick={() => onPlay?.(clip)}>
            <Play className="w-6 h-6" />
          </Button>
        </div>
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge className={cn('text-white border-0 text-xs', triggerColors[clip.trigger])}>
            <TriggerIcon className="w-3 h-3 mr-1" />
            {triggerLabels[clip.trigger]}
          </Badge>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {formatDuration(clip.duration)}
        </div>
        {clip.isFavorite && (
          <div className="absolute top-2 right-2">
            <Star className="w-5 h-5 fill-warning text-warning" />
          </div>
        )}
        {!clip.isViewed && (
          <div className="absolute bottom-2 left-2">
            <Badge variant="secondary" className="text-xs">Novo</Badge>
          </div>
        )}
      </div>
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
                <Play className="w-4 h-4 mr-2" />Reproduzir
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.(clip)}>
                <Download className="w-4 h-4 mr-2" />Baixar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleFavorite?.(clip.id)}>
                {clip.isFavorite ? (<><StarOff className="w-4 h-4 mr-2" />Remover favorito</>) : (<><Star className="w-4 h-4 mr-2" />Favoritar</>)}
              </DropdownMenuItem>
              {!clip.isViewed && (
                <DropdownMenuItem onClick={() => onMarkViewed?.(clip.id)}>
                  <Eye className="w-4 h-4 mr-2" />Marcar como visto
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete?.(clip.id)} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Film className="w-3 h-3" />{clip.frameCount}</span>
          {clip.fileSize && <span>{formatFileSize(clip.fileSize)}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export const ClipCard = memo(ClipCardBase);
