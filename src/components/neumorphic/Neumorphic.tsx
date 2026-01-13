import React from 'react';import { cn } from '@/lib/utils';interface NeumorphicProps { children: React.ReactNode; variant?: 'raised' | 'pressed' | 'flat'; className?: string; }
const variants = { raised: 'shadow-[5px_5px_10px_#bebebe,-5px_-5px_10px_#ffffff]', pressed: 'shadow-[inset_5px_5px_10px_#bebebe,inset_-5px_-5px_10px_#ffffff]', flat: 'shadow-none' };
export function Neumorphic({ children, variant = 'raised', className }: NeumorphicProps) { return <div className={cn('bg-[#e0e0e0] rounded-2xl p-6', variants[variant], className)}>{children}</div>; }
export default Neumorphic;