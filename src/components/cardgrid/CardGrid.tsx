import React from 'react';import { cn } from '@/lib/utils';interface CardGridProps { children: React.ReactNode; columns?: 1 | 2 | 3 | 4; gap?: 'sm' | 'md' | 'lg'; className?: string; }
const cols = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' }; const gaps = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' };
export function CardGrid({ children, columns = 2, gap = 'md', className }: CardGridProps) { return (<div className={cn('grid', cols[columns], gaps[gap], className)}>{children}</div>); }
export default CardGrid;