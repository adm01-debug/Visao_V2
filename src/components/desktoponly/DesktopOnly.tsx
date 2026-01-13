import React from 'react';import { cn } from '@/lib/utils';interface DesktopOnlyProps { children: React.ReactNode; className?: string; }
export function DesktopOnly({ children, className }: DesktopOnlyProps) { return <div className={cn('hidden md:block', className)}>{children}</div>; }
export default DesktopOnly;