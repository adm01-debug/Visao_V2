import { Video, Play, Download, Trash2, Camera, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Tables } from '@/integrations/supabase/types';

export interface VideoClipWithCamera extends Tables<'video_clips'> {
  camera_name: string;
}

export function formatClipDuration(seconds: number | null): string {
  if (!seconds) return '0s';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

interface ClipCardProps {
  clip: VideoClipWithCamera;
  isSelected: boolean;
  onSelect: (selected: boolean) => void;
  onPlay: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export function ClipCard({ clip, isSelected, onSelect, onPlay, onDownload, onDelete }: ClipCardProps) {
  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-md group', isSelected && 'ring-2 ring-primary')}>
      <div className="relative aspect-video bg-foreground cursor-pointer" onClick={onPlay}>
        {clip.thumbnail_url ? (
          <img src={clip.thumbnail_url} alt={`Clip ${clip.id}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted"><Video className="w-12 h-12 text-muted-foreground" /></div>
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center"><Play className="w-6 h-6 text-foreground ml-1" /></div>
        </div>
        <Badge className="absolute bottom-2 right-2 bg-foreground/70 text-background">{formatClipDuration(clip.duration)}</Badge>
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
          <Checkbox checked={isSelected} onCheckedChange={onSelect} className="bg-background/80" />
        </div>
        <Badge variant="secondary" className="absolute top-2 right-2 text-xs">{clip.status}</Badge>
      </div>
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm flex items-center gap-1"><Camera className="w-3 h-3 text-muted-foreground" />{clip.camera_name}</p>
            <p className="text-xs text-muted-foreground mt-1">{format(new Date(clip.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais opções"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onPlay}><Play className="w-4 h-4 mr-2" />Reproduzir</DropdownMenuItem>
              <DropdownMenuItem onClick={onDownload}><Download className="w-4 h-4 mr-2" />Download</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
