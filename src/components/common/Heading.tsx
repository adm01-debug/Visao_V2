import React from 'react';
import { cn } from '@/lib/utils';

interface HeadingProps {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}

const levelClasses = {
  1: 'text-4xl font-bold tracking-tight',
  2: 'text-3xl font-semibold tracking-tight',
  3: 'text-2xl font-semibold',
  4: 'text-xl font-semibold',
  5: 'text-lg font-medium',
  6: 'text-base font-medium',
};

export function Heading({ children, level = 2, className }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag className={cn(levelClasses[level], className)}>
      {children}
    </Tag>
  );
}

export default Heading;
