import React from 'react';import { cn } from '@/lib/utils';interface PaperProps { children: React.ReactNode; elevation?: 0 | 1 | 2 | 3 | 4 | 5; className?: string; }
const elevations = { 0: '', 1: 'shadow-sm', 2: 'shadow', 3: 'shadow-md', 4: 'shadow-lg', 5: 'shadow-xl' };
export function Paper({ children, elevation = 1, className }: PaperProps) { return <div className={cn('bg-card rounded-lg', elevations[elevation], className)}>{children}</div>; }
export default Paper;