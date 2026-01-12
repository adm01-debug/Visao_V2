import React from 'react';
import { cn } from '@/lib/utils';

interface ActionBarProps {
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function ActionBar({ children, position = 'bottom', className }: ActionBarProps) {
  return (
    <div className={cn(
      'fixed left-0 right-0 bg-background border-t px-4 py-3 flex items-center justify-end gap-2 z-30',
      position === 'top' ? 'top-0 border-b border-t-0' : 'bottom-0',
      className
    )}>
      {children}
    </div>
  );
}

export default ActionBar;
