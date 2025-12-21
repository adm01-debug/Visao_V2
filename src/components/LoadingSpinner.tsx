import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  text?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' };

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, text }) => (
  <div className={cn('flex items-center gap-2', className)}>
    <Loader2 className={cn('animate-spin text-primary', sizes[size])} />
    {text && <span className="text-muted-foreground text-sm">{text}</span>}
  </div>
);

export default LoadingSpinner;
