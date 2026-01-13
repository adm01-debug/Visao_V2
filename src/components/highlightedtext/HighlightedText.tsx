import React from 'react';import { cn } from '@/lib/utils';interface HighlightedTextProps { children: React.ReactNode; color?: string; className?: string; }
export function HighlightedText({ children, color = 'yellow', className }: HighlightedTextProps) { return <mark className={cn(`bg-${color}-200 px-1 rounded`, className)}>{children}</mark>; }
export default HighlightedText;