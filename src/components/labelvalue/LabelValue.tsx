import React from 'react';
import { cn } from '@/lib/utils';

interface LabelValueProps {
  label: string;
  value: React.ReactNode;
  direction?: 'horizontal' | 'vertical';
  className?: string;
}

export function LabelValue({ label, value, direction = 'horizontal', className }: LabelValueProps) {
  return (
    <div className={cn(
      direction === 'horizontal' ? 'flex items-center gap-2' : 'flex flex-col gap-1',
      className
    )}>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default LabelValue;
