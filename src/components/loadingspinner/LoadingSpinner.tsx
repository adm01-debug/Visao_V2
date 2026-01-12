import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  className?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12', xl: 'w-16 h-16' };

export function LoadingSpinner({ size = 'md', variant = 'spinner', className }: LoadingSpinnerProps) {
  if (variant === 'dots') {
    return (
      <div className={cn('flex gap-1', className)}>
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('rounded-full bg-primary animate-bounce', size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-3 h-3')}
            style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    );
  }

  if (variant === 'pulse') {
    return <div className={cn(sizes[size], 'rounded-full bg-primary animate-pulse', className)} />;
  }

  return (
    <svg className={cn(sizes[size], 'animate-spin text-primary', className)} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25" />
      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" className="opacity-75" />
    </svg>
  );
}

export default LoadingSpinner;
