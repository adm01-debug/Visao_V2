import React from 'react';
import { cn } from '@/lib/utils';

interface DotIndicatorProps {
  total: number;
  current: number;
  onChange?: (index: number) => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'h-1.5 w-1.5', md: 'h-2 w-2', lg: 'h-3 w-3' };

export function DotIndicator({ total, current, onChange, size = 'md', className }: DotIndicatorProps) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {Array.from({ length: total }, (_, i) => (
        <button key={i} onClick={() => onChange?.(i)} disabled={!onChange}
          className={cn('rounded-full transition-colors', sizeClasses[size],
            i === current ? 'bg-primary' : 'bg-muted hover:bg-muted-foreground/30')} />
      ))}
    </div>
  );
}

export default DotIndicator;
