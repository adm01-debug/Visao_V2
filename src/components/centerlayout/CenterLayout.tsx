import React from 'react';import { cn } from '@/lib/utils';interface CenterLayoutProps { children: React.ReactNode; className?: string; }
export function CenterLayout({ children, className }: CenterLayoutProps) { return (<div className={cn('flex items-center justify-center min-h-screen', className)}>{children}</div>); }
export default CenterLayout;