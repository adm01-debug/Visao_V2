import React from 'react';
import { cn } from '@/lib/utils';

interface DividerProps {
  text?: string;
  className?: string;
}

export const Divider: React.FC<DividerProps> = ({ text, className }) => (
  <div className={cn('flex items-center gap-4', className)}>
    <div className="flex-1 h-px bg-border" />
    {text && <span className="text-muted-foreground text-sm">{text}</span>}
    {text && <div className="flex-1 h-px bg-border" />}
  </div>
);

export default Divider;
