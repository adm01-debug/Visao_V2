/**
 * VIS-O - Sistema de Vigilância Inteligente
 * TimelineEvent - Single event item for timeline view
 * 
 * @module components/timelineevent
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineEventProps {
  className?: string;
  children?: React.ReactNode;
}

export const TimelineEvent: React.FC<TimelineEventProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("timelineevent", className)}>
      {children}
    </div>
  );
};

TimelineEvent.displayName = 'TimelineEvent';

export default TimelineEvent;
