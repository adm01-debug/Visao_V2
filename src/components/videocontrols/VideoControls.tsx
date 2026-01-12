import React from 'react';
import { cn } from '@/lib/utils';
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/slider/Slider';

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (time: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onFullscreen?: () => void;
  onSettings?: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VideoControls({ isPlaying, isMuted, volume, currentTime, duration, onPlayPause, onMuteToggle, onVolumeChange, onSeek, onSkipBack, onSkipForward, onFullscreen, onSettings, className }: VideoControlsProps) {
  return (
    <div className={cn('bg-black/80 text-white p-2', className)}>
      <Slider value={currentTime} min={0} max={duration} onChange={onSeek} className="mb-2" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {onSkipBack && <Button variant="ghost" size="icon" onClick={onSkipBack}><SkipBack className="h-4 w-4" /></Button>}
          <Button variant="ghost" size="icon" onClick={onPlayPause}>{isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}</Button>
          {onSkipForward && <Button variant="ghost" size="icon" onClick={onSkipForward}><SkipForward className="h-4 w-4" /></Button>}
          <span className="text-xs ml-2">{formatTime(currentTime)} / {formatTime(duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onMuteToggle}>{isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</Button>
          <div className="w-20"><Slider value={isMuted ? 0 : volume} min={0} max={100} onChange={onVolumeChange} /></div>
          {onSettings && <Button variant="ghost" size="icon" onClick={onSettings}><Settings className="h-4 w-4" /></Button>}
          {onFullscreen && <Button variant="ghost" size="icon" onClick={onFullscreen}><Maximize className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}

export default VideoControls;
