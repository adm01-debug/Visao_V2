import { Signal, Zap, Activity } from 'lucide-react';

interface StatsOverlayProps {
  bitrate: number;
  fps: number;
  latency: number;
  resolution: { width: number; height: number };
  droppedFrames: number;
}

export function VideoStatsOverlay({ bitrate, fps, latency, resolution, droppedFrames }: StatsOverlayProps) {
  return (
    <div className="absolute top-12 left-3 bg-black/70 backdrop-blur-sm rounded-lg p-2 text-xs font-mono text-white space-y-1">
      <div className="flex items-center gap-2">
        <Signal className="w-3 h-3 text-success" />
        <span>{bitrate} kbps</span>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="w-3 h-3 text-warning" />
        <span>{fps} FPS</span>
      </div>
      <div className="flex items-center gap-2">
        <Activity className="w-3 h-3 text-primary" />
        <span>{latency}ms</span>
      </div>
      <div className="text-muted-foreground">
        {resolution.width}x{resolution.height}
      </div>
      {droppedFrames > 0 && (
        <div className="text-destructive">
          Perdidos: {droppedFrames}
        </div>
      )}
    </div>
  );
}
