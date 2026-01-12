import React from 'react';
import { cn } from '@/lib/utils';

interface ColorIndicatorProps {
  color: string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

const sizeClasses = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-5 w-5' };

export function ColorIndicator({ color, size = 'md', label, className }: ColorIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('rounded-full border', sizeClasses[size])} style={{ backgroundColor: color }} />
      {label && <span className="text-sm">{label}</span>}
    </span>
  );
}

export default ColorIndicator;
