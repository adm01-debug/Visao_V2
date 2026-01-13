import React from 'react';import { cn } from '@/lib/utils';interface DotsLoaderProps { size?: 'sm' | 'md' | 'lg'; color?: string; className?: string; }
const sizes = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-3 h-3' };
export function DotsLoader({ size = 'md', color = 'bg-primary', className }: DotsLoaderProps) { return (<div className={cn('flex items-center gap-1', className)}>{[0, 1, 2].map(i => (<div key={i} className={cn('rounded-full animate-bounce', sizes[size], color)} style={{ animationDelay: `${i * 0.1}s` }} />))}</div>); }
export default DotsLoader;