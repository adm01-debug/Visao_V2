import React from 'react';
import { cn } from '@/lib/utils';
import { Activity, Gauge } from 'lucide-react';

interface StreamQualityProps {
  resolution: string;
  fps: number;
  bitrate: number;
  latency?: number;
  packetLoss?: number;
  className?: string;
}

export function StreamQuality({ resolution, fps, bitrate, latency, packetLoss, className }: StreamQualityProps) {
  const quality = fps >= 25 && bitrate >= 2000 ? 'good' : fps >= 15 ? 'medium' : 'poor';
  const colors = { good: 'text-green-500', medium: 'text-yellow-500', poor: 'text-red-500' };

  return (
    <div className={cn('flex items-center gap-4 p-2 bg-black/70 text-white text-xs rounded', className)}>
      <div className="flex items-center gap-1">
        <Activity className={cn('h-3 w-3', colors[quality])} />
        <span>{resolution}</span>
      </div>
      <span>{fps} FPS</span>
      <span>{(bitrate / 1000).toFixed(1)} Mbps</span>
      {latency !== undefined && <span>{latency}ms</span>}
      {packetLoss !== undefined && packetLoss > 0 && (
        <span className="text-red-400">{packetLoss}% loss</span>
      )}
    </div>
  );
}

export default StreamQuality;
