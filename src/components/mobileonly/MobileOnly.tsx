import React from 'react';import { cn } from '@/lib/utils';interface MobileOnlyProps { children: React.ReactNode; className?: string; }
export function MobileOnly({ children, className }: MobileOnlyProps) { return <div className={cn('block md:hidden', className)}>{children}</div>; }
export default MobileOnly;