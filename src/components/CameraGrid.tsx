/**
 * VISÃO - Sistema de Vigilância Inteligente
 * CameraGrid - Grid básico de câmeras
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { CameraCard } from './CameraCard';
import { Camera } from '@/types/surveillance';

export interface CameraGridProps {
  cameras: Camera[];
  layout?: '2x2' | '3x3' | '4x4' | 'list';
  onCameraClick?: (cameraId: string) => void;
  className?: string;
  compact?: boolean;
  searchQuery?: string;
}

const layoutClasses = {
  '2x2': 'grid-cols-1 sm:grid-cols-2',
  '3x3': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  '4x4': 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  'list': 'grid-cols-1',
};

export function CameraGrid({
  cameras,
  layout = '2x2',
  onCameraClick,
  className,
  compact = false,
  searchQuery = ''
}: CameraGridProps) {
  if (cameras.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
        <p className="text-muted-foreground">Nenhuma câmera disponível</p>
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4', layoutClasses[layout], className)}>
      {cameras.map(camera => (
        <CameraCard
          key={camera.id}
          camera={camera}
          onClick={() => onCameraClick?.(camera.id)}
          compact={compact}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}

export default CameraGrid;
