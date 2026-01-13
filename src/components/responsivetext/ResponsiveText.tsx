import React from 'react';import { cn } from '@/lib/utils';interface ResponsiveTextProps { children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string; }
const sizes = { sm: 'text-xs sm:text-sm md:text-base', md: 'text-sm sm:text-base md:text-lg', lg: 'text-base sm:text-lg md:text-xl lg:text-2xl', xl: 'text-lg sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl' };
export function ResponsiveText({ children, size = 'md', className }: ResponsiveTextProps) { return <span className={cn(sizes[size], className)}>{children}</span>; }
export default ResponsiveText;