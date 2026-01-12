import React from 'react';
import { cn } from '@/lib/utils';

interface SplitViewProps {
  left: React.ReactNode;
  right: React.ReactNode;
  leftWidth?: string;
  className?: string;
}

export function SplitView({ left, right, leftWidth = 'w-1/3', className }: SplitViewProps) {
  return (
    <div className={cn('flex h-full', className)}>
      <div className={cn('border-r overflow-auto', leftWidth)}>{left}</div>
      <div className="flex-1 overflow-auto">{right}</div>
    </div>
  );
}

export default SplitView;
