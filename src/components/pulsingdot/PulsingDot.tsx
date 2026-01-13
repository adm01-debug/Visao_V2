import React from 'react';import { cn } from '@/lib/utils';interface PulsingDotProps { color?: 'green' | 'red' | 'yellow' | 'blue'; size?: 'sm' | 'md' | 'lg'; className?: string; }
const colors = { green: 'bg-green-500', red: 'bg-red-500', yellow: 'bg-yellow-500', blue: 'bg-blue-500' };
const sizes = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
export function PulsingDot({ color = 'green', size = 'md', className }: PulsingDotProps) { return (<span className={cn('relative inline-flex', className)}><span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-75', colors[color])} /><span className={cn('relative inline-flex rounded-full', colors[color], sizes[size])} /></span>); }
export default PulsingDot;