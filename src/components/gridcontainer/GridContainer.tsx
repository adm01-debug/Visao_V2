import React from 'react';import { cn } from '@/lib/utils';
interface Props { cols?: 1 | 2 | 3 | 4 | 5 | 6; gap?: 'sm' | 'md' | 'lg'; children: React.ReactNode; className?: string; }
const colsMap = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6' };
const gapMap = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' };
export function GridContainer({ cols = 3, gap = 'md', children, className }: Props) { return (<div className={cn('grid', colsMap[cols], gapMap[gap], className)}>{children}</div>); }
export default GridContainer;