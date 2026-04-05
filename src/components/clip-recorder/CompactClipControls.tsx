/**
 * VISÃO - Compact Clip Recorder Controls
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Circle, Square, Download, Trash2, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SavedClip {
  id: string; duration: number; url: string;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface CompactClipControlsProps {
  state: string;
  duration: number;
  savedClip: SavedClip | null;
  onStart: () => void;
  onStop: () => void;
  onDownload: () => void;
  onDiscard: () => void;
  className?: string;
}

export function CompactClipControls({ state, duration, savedClip, onStart, onStop, onDownload, onDiscard, className }: CompactClipControlsProps) {
  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-1', className)}>
        {state === 'idle' && (
          <Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-background/20" onClick={onStart}>
              <Circle className="w-4 h-4 fill-destructive text-destructive" />
            </Button>
          </TooltipTrigger><TooltipContent>Iniciar gravação</TooltipContent></Tooltip>
        )}
        {(state === 'recording' || state === 'paused') && (
          <>
            <Badge variant="destructive" className="gap-1 animate-pulse">
              <Circle className="w-2 h-2 fill-current" />{formatDuration(duration)}
            </Badge>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-background/20" onClick={onStop}>
                <Square className="w-4 h-4 fill-current" />
              </Button>
            </TooltipTrigger><TooltipContent>Parar gravação</TooltipContent></Tooltip>
          </>
        )}
        {state === 'processing' && <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Processando</Badge>}
        {state === 'saved' && savedClip && (
          <>
            <Badge variant="secondary" className="gap-1"><Check className="w-3 h-3" />{formatDuration(savedClip.duration)}</Badge>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-background/20" onClick={onDownload}><Download className="w-4 h-4" /></Button>
            </TooltipTrigger><TooltipContent>Download</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground hover:bg-background/20" onClick={onDiscard}><Trash2 className="w-4 h-4" /></Button>
            </TooltipTrigger><TooltipContent>Descartar</TooltipContent></Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export { formatDuration };
