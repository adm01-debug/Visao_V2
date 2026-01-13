import React from 'react';import { cn } from '@/lib/utils';interface TabletOnlyProps { children: React.ReactNode; className?: string; }
export function TabletOnly({ children, className }: TabletOnlyProps) { return <div className={cn('hidden sm:block lg:hidden', className)}>{children}</div>; }
export default TabletOnly;