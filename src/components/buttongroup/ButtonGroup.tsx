import React from 'react';import { cn } from '@/lib/utils';
interface Props { children: React.ReactNode; className?: string; }
export function ButtonGroup({ children, className }: Props) { return (<div className={cn('inline-flex rounded-lg overflow-hidden border divide-x', className)}>{children}</div>); }
export default ButtonGroup;