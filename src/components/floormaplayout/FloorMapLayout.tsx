import React from 'react';
import { cn } from '@/lib/utils';
import { LocationMarker } from '@/components/locationmarker/LocationMarker';

interface Camera {
  id: string;
  name: string;
  x: number;
  y: number;
  status: 'online' | 'offline' | 'alert';
}

interface FloorMapLayoutProps {
  backgroundImage?: string;
  cameras: Camera[];
  selectedId?: string;
  onCameraClick?: (camera: Camera) => void;
  className?: string;
}

export function FloorMapLayout({ backgroundImage, cameras, selectedId, onCameraClick, className }: FloorMapLayoutProps) {
  return (
    <div className={cn('relative w-full aspect-video bg-muted rounded-lg overflow-hidden', className)}>
      {backgroundImage && <img src={backgroundImage} alt="Floor plan" className="absolute inset-0 w-full h-full object-contain" />}
      {cameras.map(cam => (
        <div key={cam.id} className="absolute" style={{ left: `${cam.x}%`, top: `${cam.y}%`, transform: 'translate(-50%, -100%)' }}>
          <LocationMarker name={cam.name} status={cam.status} selected={cam.id === selectedId} onClick={() => onCameraClick?.(cam)} />
        </div>
      ))}
    </div>
  );
}

export default FloorMapLayout;
