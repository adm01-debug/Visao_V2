import React from 'react';
import { cn } from '@/lib/utils';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  label?: string;
}

export function Divider({ orientation = 'horizontal', className, label }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn('w-px bg-border self-stretch', className)} />;
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-4', className)}>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    );
  }

  return <div className={cn('h-px bg-border w-full', className)} />;
}

export default Divider;
