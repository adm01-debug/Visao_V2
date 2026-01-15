/**
 * VIS-O - Sistema de Vigilância Inteligente
 * TimestampOverlay - Timestamp overlay for video/camera feeds
 * 
 * @module components/timestampoverlay
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TimestampOverlayProps {
  className?: string;
  children?: React.ReactNode;
}

export const TimestampOverlay: React.FC<TimestampOverlayProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("timestampoverlay", className)}>
      {children}
    </div>
  );
};

TimestampOverlay.displayName = 'TimestampOverlay';

export default TimestampOverlay;
