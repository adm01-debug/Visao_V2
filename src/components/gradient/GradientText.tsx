import React from 'react';
import { cn } from '@/lib/utils';

interface GradientTextProps { children: React.ReactNode; from?: string; to?: string; via?: string; className?: string; }

export function GradientText({ children, from = '#3b82f6', to = '#8b5cf6', via, className }: GradientTextProps) {
  const gradient = via ? `linear-gradient(to right, ${from}, ${via}, ${to})` : `linear-gradient(to right, ${from}, ${to})`;

  return (
    <span className={cn('bg-clip-text text-transparent font-bold', className)} style={{ backgroundImage: gradient }}>
      {children}
    </span>
  );
}

export default GradientText;
