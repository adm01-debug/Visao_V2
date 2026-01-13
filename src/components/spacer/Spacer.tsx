import React from 'react';import { cn } from '@/lib/utils';interface SpacerProps { size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; direction?: 'horizontal' | 'vertical'; className?: string; }
const sizes = { xs: 2, sm: 4, md: 8, lg: 12, xl: 16 };
export function Spacer({ size = 'md', direction = 'vertical', className }: SpacerProps) { const s = sizes[size]; return <div className={cn(direction === 'vertical' ? `h-${s}` : `w-${s}`, className)} aria-hidden="true" />; }
export default Spacer;