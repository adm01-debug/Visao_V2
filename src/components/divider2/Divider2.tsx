import React from 'react';import { cn } from '@/lib/utils';interface Divider2Props { orientation?: 'horizontal' | 'vertical'; className?: string; }
export function Divider2({ orientation = 'horizontal', className }: Divider2Props) { return <div className={cn(orientation === 'horizontal' ? 'h-px w-full bg-border' : 'w-px h-full bg-border', className)} role="separator" />; }
export default Divider2;