import React from 'react';import { cn } from '@/lib/utils';
interface Props { direction?: 'row' | 'col'; justify?: 'start' | 'center' | 'end' | 'between'; align?: 'start' | 'center' | 'end'; gap?: 'sm' | 'md' | 'lg'; children: React.ReactNode; className?: string; }
const dirMap = { row: 'flex-row', col: 'flex-col' };
const justMap = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between' };
const alignMap = { start: 'items-start', center: 'items-center', end: 'items-end' };
const gapMap = { sm: 'gap-2', md: 'gap-4', lg: 'gap-6' };
export function FlexContainer({ direction = 'row', justify = 'start', align = 'center', gap = 'md', children, className }: Props) { return (<div className={cn('flex', dirMap[direction], justMap[justify], alignMap[align], gapMap[gap], className)}>{children}</div>); }
export default FlexContainer;