/**
 * VISÃO - Sistema de Vigilância Inteligente
 * VideoControls Component
 */

import { memo } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Maximize,
  Rewind,
  FastForward,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface VideoControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  playbackRate: number;
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onSeek: (time: number) => void;
  onSkipBack: (seconds?: number) => void;
  onSkipForward: (seconds?: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onFullscreen?: () => void;
  showTime?: boolean;
  className?: string;
}

function formatTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function VideoControlsComponent({
  isPlaying,
  isMuted,
  volume,
  currentTime,
  duration,
  playbackRate,
  onPlayPause,
  onMuteToggle,
  onVolumeChange,
  onSeek,
  onSkipBack,
  onSkipForward,
  onPlaybackRateChange,
  onFullscreen,
  showTime = true,
  className
}: VideoControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <Slider
        value={[progress]}
        onValueChange={(v) => onSeek((v[0] / 100) * duration)}
        max={100}
        step={0.1}
        className="w-full cursor-pointer"
      />

      {/* Controls row */}
      <div className="flex items-center gap-2">
        {/* Skip back */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSkipBack(10)}
          className="h-8 w-8"
        >
          <Rewind className="w-4 h-4" />
        </Button>

        {/* Play/Pause */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onPlayPause}
          className="h-10 w-10"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
        </Button>

        {/* Skip forward */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onSkipForward(10)}
          className="h-8 w-8"
        >
          <FastForward className="w-4 h-4" />
        </Button>

        {/* Time display */}
        {showTime && (
          <div className="text-sm text-muted-foreground min-w-[100px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}

        <div className="flex-1" />

        {/* Volume controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMuteToggle}
            className="h-8 w-8"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </Button>
          <Slider
            value={[volume]}
            onValueChange={(v) => onVolumeChange(v[0])}
            max={100}
            step={1}
            className="w-20"
          />
        </div>

        {/* Playback speed */}
        {onPlaybackRateChange && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const rates = [0.5, 1, 1.5, 2];
              const currentIndex = rates.indexOf(playbackRate);
              const nextIndex = (currentIndex + 1) % rates.length;
              onPlaybackRateChange(rates[nextIndex]);
            }}
            className="min-w-[50px]"
          >
            {playbackRate}x
          </Button>
        )}

        {/* Fullscreen */}
        {onFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreen}
            className="h-8 w-8"
          >
            <Maximize className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export const VideoControls = memo(VideoControlsComponent);
