import React from 'react';import { cn } from '@/lib/utils';interface SurfaceProps { children: React.ReactNode; variant?: 'default' | 'elevated' | 'outlined'; className?: string; }
const variants = { default: 'bg-card', elevated: 'bg-card shadow-lg', outlined: 'bg-transparent border' };
export function Surface({ children, variant = 'default', className }: SurfaceProps) { return <div className={cn('rounded-lg', variants[variant], className)}>{children}</div>; }
export default Surface;