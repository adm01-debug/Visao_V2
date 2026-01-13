import React from 'react';import { cn } from '@/lib/utils';interface SpinnerLoaderProps { size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; }
const sizes = { sm: 'w-4 h-4 border-2', md: 'w-6 h-6 border-2', lg: 'w-8 h-8 border-3', xl: 'w-12 h-12 border-4' };
export function SpinnerLoader({ size = 'md', className }: SpinnerLoaderProps) { return <div className={cn('rounded-full border-primary/30 border-t-primary animate-spin', sizes[size], className)} />; }
export default SpinnerLoader;