import { useState } from 'react';
import { Camera, ChevronLeft, ChevronRight, Download, Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { VideoClipWithCamera } from './ClipCard';
import { formatClipDuration } from './ClipCard';

interface VideoPlayerDialogProps {
  clip: VideoClipWithCamera | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function VideoPlayerDialog({ clip, isOpen, onClose, onPrev, onNext, hasPrev, hasNext }: VideoPlayerDialogProps) {
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!clip) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <div className="flex flex-col">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" />{clip.camera_name}</DialogTitle>
            <DialogDescription>{format(new Date(clip.start_time), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })} • {formatClipDuration(clip.duration)}</DialogDescription>
          </DialogHeader>
          <div className="relative aspect-video bg-foreground mt-4">
            <video src={clip.file_url || undefined} className="w-full h-full" autoPlay={isPlaying} muted={isMuted} controls={false}
              onTimeUpdate={(e) => { const v = e.target as HTMLVideoElement; setProgress((v.currentTime / v.duration) * 100); }} />
            {hasPrev && <Button variant="ghost" size="icon" className="absolute left-4 top-1/2 -translate-y-1/2 text-background bg-foreground/50 hover:bg-foreground/70" onClick={onPrev} aria-label="Anterior"><ChevronLeft className="w-6 h-6" /></Button>}
            {hasNext && <Button variant="ghost" size="icon" className="absolute right-4 top-1/2 -translate-y-1/2 text-background bg-foreground/50 hover:bg-foreground/70" onClick={onNext} aria-label="Próximo"><ChevronRight className="w-6 h-6" /></Button>}
          </div>
          <div className="p-4 space-y-2">
            <Slider value={[progress]} max={100} step={0.1} className="cursor-pointer" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() = setIsPlaying(!isPlaying)}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</Button>
                <Button variant="ghost" size="icon" onClick={() = setIsMuted(!isMuted)}>{isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}</Button>
              </div>
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" />Download</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
