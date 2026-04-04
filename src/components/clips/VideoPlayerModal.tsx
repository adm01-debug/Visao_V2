import { useState } from 'react';
import { Camera, Calendar, Clock, Film } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { VideoClip, formatDuration, formatFileSize } from '@/types/clips';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { triggerLabels, triggerColors } from './clipConstants';

interface VideoPlayerModalProps {
  clip: VideoClip | null;
  open: boolean;
  onClose: () => void;
}

export function VideoPlayerModal({ clip, open, onClose }: VideoPlayerModalProps) {
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
              {clip.fileSize && <span>{formatFileSize(clip.fileSize)}</span>}
            </div>
          </div>
          {clip.triggerDetails && (
            <p className="mt-2 text-sm text-muted-foreground">{clip.triggerDetails}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
