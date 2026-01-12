import React from 'react';
import { cn } from '@/lib/utils';

interface GlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { children: React.ReactNode; color?: string; }

export function GlowButton({ children, color = '#3b82f6', className, ...props }: GlowButtonProps) {
  return (
    <button className={cn('relative px-6 py-3 rounded-lg font-medium text-white transition-all hover:scale-105', className)}
      style={{ backgroundColor: color, boxShadow: `0 0 20px ${color}80, 0 0 40px ${color}40` }} {...props}>
      {children}
    </button>
  );
}

export default GlowButton;
