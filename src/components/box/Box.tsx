import React from 'react';import { cn } from '@/lib/utils';interface BoxProps { children: React.ReactNode; as?: keyof JSX.IntrinsicElements; className?: string; }
export function Box({ children, as: Component = 'div', className }: BoxProps) { return <Component className={cn(className)}>{children}</Component>; }
export default Box;