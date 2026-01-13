import React from 'react';import { cn } from '@/lib/utils';interface Center2Props { children: React.ReactNode; className?: string; }
export function Center2({ children, className }: Center2Props) { return <div className={cn('flex items-center justify-center', className)}>{children}</div>; }
export default Center2;