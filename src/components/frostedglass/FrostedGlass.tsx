import React from 'react';import { cn } from '@/lib/utils';interface FrostedGlassProps { children: React.ReactNode; className?: string; }
export function FrostedGlass({ children, className }: FrostedGlassProps) { return <div className={cn('bg-white/30 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl', className)}>{children}</div>; }
export default FrostedGlass;