import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward } from 'lucide-react';

interface VideoPlayerControlsProps { playing: boolean; muted: boolean; progress: number; duration: string; currentTime: string; onPlayPause: () => void; onMute: () => void; onSeek: (progress: number) => void; onFullscreen: () => void; className?: string; }

export function VideoPlayerControls({ playing, muted, progress, duration, currentTime, onPlayPause, onMute, onSeek, onFullscreen, className }: VideoPlayerControlsProps) {
  return (
    <div className={cn('absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent', className)}>
      <div className="h-1 bg-white/30 rounded-full mb-3 cursor-pointer" onClick={e => { const rect = e.currentTarget.getBoundingClientRect(); onSeek((e.clientX - rect.left) / rect.width * 100); }}>
        <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-2">
          <button onClick={onPlayPause}>{playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</button>
          <button onClick={onMute}>{muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
          <span className="text-sm">{currentTime} / {duration}</span>
        </div>
        <button onClick={onFullscreen}><Maximize className="h-5 w-5" /></button>
      </div>
    </div>
  );
}

export default VideoPlayerControls;
