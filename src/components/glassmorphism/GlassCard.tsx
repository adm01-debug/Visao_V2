import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps { children: React.ReactNode; blur?: 'sm' | 'md' | 'lg'; className?: string; }

const blurs = { sm: 'backdrop-blur-sm', md: 'backdrop-blur-md', lg: 'backdrop-blur-lg' };

export function GlassCard({ children, blur = 'md', className }: GlassCardProps) {
  return (
    <div className={cn('bg-white/10 border border-white/20 rounded-xl shadow-xl', blurs[blur], className)}>
      {children}
    </div>
  );
}

export default GlassCard;
