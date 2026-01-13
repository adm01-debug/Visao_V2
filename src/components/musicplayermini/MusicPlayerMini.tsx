import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Shuffle } from 'lucide-react';

interface MusicPlayerMiniProps { title: string; artist: string; albumArt?: string; playing?: boolean; progress?: number; onPlayPause?: () => void; onPrev?: () => void; onNext?: () => void; className?: string; }

export function MusicPlayerMini({ title, artist, albumArt, playing, progress = 0, onPlayPause, onPrev, onNext, className }: MusicPlayerMiniProps) {
  return (
    <div className={cn('flex items-center gap-4 p-3 rounded-xl border bg-card', className)}>
      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">{albumArt && <img src={albumArt} alt="" className="w-full h-full object-cover" />}</div>
      <div className="flex-1 min-w-0"><p className="font-medium truncate">{title}</p><p className="text-sm text-muted-foreground truncate">{artist}</p></div>
      <div className="flex items-center gap-1">
        <button onClick={onPrev} className="p-2 hover:bg-accent rounded-full"><SkipBack className="h-4 w-4" /></button>
        <button onClick={onPlayPause} className="p-2 bg-primary text-primary-foreground rounded-full">{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
        <button onClick={onNext} className="p-2 hover:bg-accent rounded-full"><SkipForward className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

export default MusicPlayerMini;
