/**
 * VISÃO - Sistema de Vigilância Inteligente
 * StreamControls Component
 */

import { memo } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Minimize,
  Settings,
  RefreshCw,
  Camera,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type StreamQuality = 'auto' | '1080p' | '720p' | '480p' | '360p';

interface StreamControlsProps {
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  isFullscreen: boolean;
  quality?: StreamQuality;
  availableQualities?: StreamQuality[];
  onPlayPause: () => void;
  onMuteToggle: () => void;
  onVolumeChange: (volume: number) => void;
  onFullscreenToggle: () => void;
  onQualityChange?: (quality: StreamQuality) => void;
  onRefresh?: () => void;
  onSnapshot?: () => void;
  onDownload?: () => void;
  compact?: boolean;
  className?: string;
}

function StreamControlsComponent({
  isPlaying,
  isMuted,
  volume,
  isFullscreen,
  quality = 'auto',
  availableQualities = ['auto', '1080p', '720p', '480p', '360p'],
  onPlayPause,
  onMuteToggle,
  onVolumeChange,
  onFullscreenToggle,
  onQualityChange,
  onRefresh,
  onSnapshot,
  onDownload,
  compact = false,
  className
}: StreamControlsProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-background/90 backdrop-blur-sm rounded-lg",
      compact && "gap-1 p-1",
      className
    )}>
      {/* Play/Pause */}
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        onClick={onPlayPause}
        className={compact ? "h-7 w-7" : ""}
      >
        {isPlaying ? (
          <Pause className={compact ? "w-3 h-3" : "w-4 h-4"} />
        ) : (
          <Play className={compact ? "w-3 h-3" : "w-4 h-4"} />
        )}
      </Button>

      {/* Volume */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          onClick={onMuteToggle}
          className={compact ? "h-7 w-7" : ""}
        >
          {isMuted || volume === 0 ? (
            <VolumeX className={compact ? "w-3 h-3" : "w-4 h-4"} />
          ) : (
            <Volume2 className={compact ? "w-3 h-3" : "w-4 h-4"} />
          )}
        </Button>
        
        {!compact && (
          <Slider
            value={[volume]}
            onValueChange={(v) => onVolumeChange(v[0])}
            max={100}
            step={1}
            className="w-20"
          />
        )}
      </div>

      <div className="flex-1" />

      {/* Refresh */}
      {onRefresh && (
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          onClick={onRefresh}
          className={compact ? "h-7 w-7" : ""}
        >
          <RefreshCw className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </Button>
      )}

      {/* Snapshot */}
      {onSnapshot && (
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          onClick={onSnapshot}
          className={compact ? "h-7 w-7" : ""}
        >
          <Camera className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </Button>
      )}

      {/* Download */}
      {onDownload && (
        <Button
          variant="ghost"
          size={compact ? "icon" : "sm"}
          onClick={onDownload}
          className={compact ? "h-7 w-7" : ""}
        >
          <Download className={compact ? "w-3 h-3" : "w-4 h-4"} />
        </Button>
      )}

      {/* Quality Settings */}
      {onQualityChange && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size={compact ? "icon" : "sm"}
              className={compact ? "h-7 w-7" : "gap-1"}
            >
              <Settings className={compact ? "w-3 h-3" : "w-4 h-4"} />
              {!compact && <span className="text-xs">{quality}</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {availableQualities.map((q) => (
              <DropdownMenuItem
                key={q}
                onClick={() => onQualityChange(q)}
                className={quality === q ? 'bg-accent' : ''}
              >
                {q === 'auto' ? 'Auto' : q}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Fullscreen */}
      <Button
        variant="ghost"
        size={compact ? "icon" : "sm"}
        onClick={onFullscreenToggle}
        className={compact ? "h-7 w-7" : ""}
      >
        {isFullscreen ? (
          <Minimize className={compact ? "w-3 h-3" : "w-4 h-4"} />
        ) : (
          <Maximize className={compact ? "w-3 h-3" : "w-4 h-4"} />
        )}
      </Button>
    </div>
  );
}

export const StreamControls = memo(StreamControlsComponent);
