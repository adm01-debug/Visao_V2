import React from 'react';
import { cn } from '@/lib/utils';

interface MorphBackgroundProps { children: React.ReactNode; colors?: string[]; className?: string; }

export function MorphBackground({ children, colors = ['#3b82f6', '#8b5cf6', '#ec4899'], className }: MorphBackgroundProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 opacity-30">
        {colors.map((c, i) => (
          <div key={i} className="absolute w-96 h-96 rounded-full blur-3xl animate-pulse"
            style={{ backgroundColor: c, left: `${i * 30}%`, top: `${i * 20}%`, animationDelay: `${i * 500}ms`, animationDuration: '4s' }} />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default MorphBackground;
