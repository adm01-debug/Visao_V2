import React from 'react';
import { cn } from '@/lib/utils';
import { CameraCard } from '@/components/cameracard/CameraCard';

interface Camera {
  id: string;
  name: string;
  location?: string;
  thumbnail?: string;
  status: 'online' | 'offline' | 'recording' | 'alert';
  lastSeen?: string;
}

interface CameraGridProps {
  cameras: Camera[];
  columns?: 1 | 2 | 3 | 4;
  onCameraClick?: (camera: Camera) => void;
  onCameraSettings?: (camera: Camera) => void;
  className?: string;
}

const colClasses = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

export function CameraGrid({ cameras, columns = 3, onCameraClick, onCameraSettings, className }: CameraGridProps) {
  return (
    <div className={cn('grid gap-4', colClasses[columns], className)}>
      {cameras.map(camera => (
        <CameraCard
          key={camera.id}
          {...camera}
          onClick={() => onCameraClick?.(camera)}
          onSettings={() => onCameraSettings?.(camera)}
        />
      ))}
    </div>
  );
}

export default CameraGrid;
