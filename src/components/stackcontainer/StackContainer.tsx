import React from 'react';import { cn } from '@/lib/utils';
interface Props { spacing?: 'sm' | 'md' | 'lg'; children: React.ReactNode; className?: string; }
const spacingMap = { sm: 'space-y-2', md: 'space-y-4', lg: 'space-y-6' };
export function StackContainer({ spacing = 'md', children, className }: Props) { return (<div className={cn(spacingMap[spacing], className)}>{children}</div>); }
export default StackContainer;