import React from 'react';import { cn } from '@/lib/utils';interface LoadingDotsProps { size?: 'sm' | 'md' | 'lg'; className?: string; }
const sizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
export function LoadingDots({ size = 'md', className }: LoadingDotsProps) { return (<div className={cn('flex gap-1', className)}>{[0, 1, 2].map(i => <span key={i} className={cn('rounded-full bg-primary animate-bounce', sizes[size])} style={{ animationDelay: `${i * 0.15}s` }} />)}</div>); }
export default LoadingDots;