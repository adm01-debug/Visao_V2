import React from 'react';import { cn } from '@/lib/utils';
interface Props { children: React.ReactNode; className?: string; }
export function CenterContainer({ children, className }: Props) { return (<div className={cn('flex items-center justify-center', className)}>{children}</div>); }
export default CenterContainer;