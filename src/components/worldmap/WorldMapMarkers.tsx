import React from 'react';
import { cn } from '@/lib/utils';

interface Marker { lat: number; lng: number; label?: string; color?: string; }
interface WorldMapMarkersProps { markers: Marker[]; width?: number; height?: number; className?: string; }

export function WorldMapMarkers({ markers, width = 800, height = 400, className }: WorldMapMarkersProps) {
  const toXY = (lat: number, lng: number) => ({ x: ((lng + 180) / 360) * width, y: ((90 - lat) / 180) * height });

  return (
    <div className={cn('relative bg-blue-50 rounded-lg overflow-hidden', className)} style={{ width, height }}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,...')] opacity-20" />
      {markers.map((m, i) => {
        const pos = toXY(m.lat, m.lng);
        return (
          <div key={i} className="absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"
            style={{ left: pos.x, top: pos.y, backgroundColor: m.color || '#ef4444' }} title={m.label} />
        );
      })}
    </div>
  );
}

export default WorldMapMarkers;
