import React from 'react';import { cn } from '@/lib/utils';interface BarsLoaderProps { size?: 'sm' | 'md' | 'lg'; className?: string; }
const sizes = { sm: { w: 'w-0.5', h: 'h-3' }, md: { w: 'w-1', h: 'h-5' }, lg: { w: 'w-1.5', h: 'h-8' } };
export function BarsLoader({ size = 'md', className }: BarsLoaderProps) { return (<div className={cn('flex items-center gap-0.5', className)}>{[0, 1, 2, 3, 4].map(i => (<div key={i} className={cn('bg-primary rounded-full animate-pulse', sizes[size].w, sizes[size].h)} style={{ animationDelay: `${i * 0.1}s` }} />))}</div>); }
export default BarsLoader;