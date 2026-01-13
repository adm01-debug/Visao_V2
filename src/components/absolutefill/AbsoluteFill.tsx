import React from 'react';import { cn } from '@/lib/utils';interface AbsoluteFillProps { children: React.ReactNode; className?: string; }
export function AbsoluteFill({ children, className }: AbsoluteFillProps) { return <div className={cn('absolute inset-0', className)}>{children}</div>; }
export default AbsoluteFill;