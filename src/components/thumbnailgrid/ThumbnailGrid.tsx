/**
 * VIS-O - Sistema de Vigilância Inteligente
 * ThumbnailGrid - Grid layout for thumbnails/images
 * 
 * @module components/thumbnailgrid
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ThumbnailGridProps {
  className?: string;
  children?: React.ReactNode;
}

export const ThumbnailGrid: React.FC<ThumbnailGridProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("thumbnailgrid", className)}>
      {children}
    </div>
  );
};

ThumbnailGrid.displayName = 'ThumbnailGrid';

export default ThumbnailGrid;
