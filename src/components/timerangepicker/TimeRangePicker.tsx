/**
 * VIS-O - Sistema de Vigilância Inteligente
 * TimeRangePicker - Date/time range picker component
 * 
 * @module components/timerangepicker
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TimeRangePickerProps {
  className?: string;
  children?: React.ReactNode;
}

export const TimeRangePicker: React.FC<TimeRangePickerProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("timerangepicker", className)}>
      {children}
    </div>
  );
};

TimeRangePicker.displayName = 'TimeRangePicker';

export default TimeRangePicker;
