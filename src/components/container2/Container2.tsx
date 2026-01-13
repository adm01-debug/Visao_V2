import React from 'react';import { cn } from '@/lib/utils';interface Container2Props { children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'; className?: string; }
const sizes = { sm: 'max-w-2xl', md: 'max-w-4xl', lg: 'max-w-6xl', xl: 'max-w-7xl', full: 'max-w-full' };
export function Container2({ children, size = 'lg', className }: Container2Props) { return <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', sizes[size], className)}>{children}</div>; }
export default Container2;