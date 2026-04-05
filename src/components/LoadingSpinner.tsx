import React from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizes = { sm: 'w-6 h-6', md: 'w-10 h-10', lg: 'w-14 h-14' };
const iconSizes = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-7 h-7' };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, text }) => (
  <div className={cn('flex flex-col items-center gap-3', className)}>
    <div className={cn('relative rounded-xl bg-primary/10 flex items-center justify-center animate-pulse', sizes[size])} style={{ boxShadow: '0 0 30px hsl(var(--primary) / 0.2)' }}>
      <Shield className={cn('text-primary', iconSizes[size])} />
      <div className="absolute inset-0 rounded-xl border-2 border-primary/30 animate-spin" style={{ borderTopColor: 'hsl(var(--primary))', animationDuration: '1.5s' }} />
    </div>
    {text && <span className="text-muted-foreground text-sm">{text}</span>}
  </div>
);

export default LoadingSpinner;
