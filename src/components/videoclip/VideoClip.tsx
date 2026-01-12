import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Download, Trash2, Clock, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VideoClipProps {
  id: string;
  thumbnail?: string;
  duration: number;
  startTime: Date;
  camera: string;
  size?: number;
  onPlay?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  className?: string;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function VideoClip({ id, thumbnail, duration, startTime, camera, size, onPlay, onDownload, onDelete, className }: VideoClipProps) {
  return (
    <div className={cn('flex gap-3 p-3 rounded-lg border bg-card', className)}>
      <div className="relative w-32 aspect-video bg-muted rounded overflow-hidden cursor-pointer" onClick={onPlay}>
        {thumbnail && <img src={thumbnail} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/50 transition-colors">
          <Play className="h-8 w-8 text-white fill-white" />
        </div>
        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 rounded">{formatDuration(duration)}</span>
      </div>
      <div className="flex-1">
        <p className="font-medium">{camera}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Calendar className="h-3 w-3" />
          <span>{startTime.toLocaleDateString('pt-BR')}</span>
          <Clock className="h-3 w-3 ml-2" />
          <span>{startTime.toLocaleTimeString('pt-BR')}</span>
        </div>
        {size && <p className="text-xs text-muted-foreground mt-1">{formatSize(size)}</p>}
        <div className="flex gap-1 mt-2">
          {onDownload && <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-3 w-3" /></Button>}
          {onDelete && <Button size="sm" variant="outline" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>}
        </div>
      </div>
    </div>
  );
}

export default VideoClip;
