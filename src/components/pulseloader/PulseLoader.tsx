import React from 'react';import { cn } from '@/lib/utils';interface PulseLoaderProps { size?: 'sm' | 'md' | 'lg'; color?: string; className?: string; }
const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
export function PulseLoader({ size = 'md', color = 'bg-primary', className }: PulseLoaderProps) { return (<div className={cn('flex gap-1', className)}>{[0, 1, 2].map(i => (<div key={i} className={cn('rounded-full animate-pulse', sizes[size], color)} style={{ animationDelay: `${i * 0.15}s` }} />))}</div>); }
export default PulseLoader;