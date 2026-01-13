import React from 'react';import { cn } from '@/lib/utils';interface PinterestProps { children: React.ReactNode; columns?: number; className?: string; }
export function Pinterest({ children, columns = 4, className }: PinterestProps) { return <div className={cn(`columns-${columns} gap-4 space-y-4`, className)}>{children}</div>; }
export default Pinterest;