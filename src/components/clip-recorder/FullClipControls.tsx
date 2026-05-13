/**
 * VISÃO - Full Clip Recorder Controls
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Circle, Square, Download, Trash2, Clock, Video, Pause, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDuration } from './CompactClipControls';

interface SavedClip {
  id: string;
  duration: number;
  url: string;
  blob: Blob;
  thumbnail: string | undefined;
}

interface FullClipControlsProps {
  state: string;
  duration: number;
  maxDuration: number;
  progress: number;
  savedClip: SavedClip | null;
  clipDurationSetting: number;
  setClipDurationSetting: (v: number) => void;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onDownload: () => void;
  onDiscard: () => void;
  className?: string;
}

export function FullClipControls({
  state, duration, maxDuration, progress, savedClip,
  clipDurationSetting, setClipDurationSetting,
  onStart, onStop, onPause, onDownload, onDiscard, className,
}: FullClipControlsProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Video className="w-4 h-4" /><span className="text-sm font-medium">Gravação</span></div>
        {state !== 'idle' && (
          <Badge variant={state === 'recording' ? 'destructive' : 'secondary'} className={cn(state === 'recording' && 'animate-pulse')}>
            {state === 'recording' && 'Gravando'}{state === 'paused' && 'Pausado'}{state === 'processing' && 'Processando'}{state === 'saved' && 'Salvo'}
          </Badge>
        )}
      </div>

      {(state === 'recording' || state === 'paused') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-mono text-lg">{formatDuration(duration)}</span>
            <span className="text-muted-foreground">/ {formatDuration(maxDuration)}</span>
          </div>
          <Progress value={progress} className="h-1" />
        </div>
      )}

      <div className="flex items-center gap-2">
        {state === 'idle' && (
          <>
            <Button variant="destructive" size="sm" className="flex-1" onClick={onStart}>
              <Circle className="w-4 h-4 mr-2 fill-current" />Gravar
            </Button>
            <Popover>
              <PopoverTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9"><Clock className="w-4 h-4" /></Button></PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-3">
                  <Label>Duração máxima: {formatDuration(clipDurationSetting)}</Label>
                  <Slider value={[clipDurationSetting]} onValueChange={([v]) => setClipDurationSetting(v!)} min={10} max={maxDuration} step={10} />
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}
        {(state === 'recording' || state === 'paused') && (
          <>
            <Button variant="outline" size="sm" onClick={onPause}>
              {state === 'recording' ? <><Pause className="w-4 h-4 mr-2" />Pausar</> : <><Play className="w-4 h-4 mr-2" />Retomar</>}
            </Button>
            <Button variant="destructive" size="sm" className="flex-1" onClick={onStop}>
              <Square className="w-4 h-4 mr-2 fill-current" />Parar
            </Button>
          </>
        )}
        {state === 'processing' && (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">Processando clip...</span></div>
        )}
        {state === 'saved' && savedClip && (
          <>
            <Button variant="default" size="sm" className="flex-1" onClick={onDownload}><Download className="w-4 h-4 mr-2" />Download</Button>
            <Button variant="outline" size="sm" onClick={onDiscard}><Trash2 className="w-4 h-4 mr-2" />Descartar</Button>
          </>
        )}
      </div>

      {state === 'saved' && savedClip && (
        <div className="p-3 bg-muted rounded-lg space-y-2">
          {savedClip.thumbnail && <img src={savedClip.thumbnail} alt="Thumbnail" className="w-full h-20 object-cover rounded" />}
          <div className="text-xs text-muted-foreground space-y-1">
            <div className="flex justify-between"><span>Duração:</span><span className="font-medium">{formatDuration(savedClip.duration)}</span></div>
            <div className="flex justify-between"><span>Tamanho:</span><span className="font-medium">{(savedClip.blob.size / (1024 * 1024)).toFixed(2)} MB</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
