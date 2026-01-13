import React from 'react';import { cn } from '@/lib/utils';interface WrapperProps { children: React.ReactNode; padding?: 'sm' | 'md' | 'lg' | 'none'; className?: string; }
const paddings = { none: '', sm: 'p-2 sm:p-4', md: 'p-4 sm:p-6 lg:p-8', lg: 'p-6 sm:p-8 lg:p-12' };
export function Wrapper({ children, padding = 'md', className }: WrapperProps) { return <div className={cn(paddings[padding], className)}>{children}</div>; }
export default Wrapper;