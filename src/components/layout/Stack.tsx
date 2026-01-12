import React from 'react';
import { cn } from '@/lib/utils';

interface StackProps {
  children: React.ReactNode;
  direction?: 'row' | 'column';
  gap?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

const gapClasses = {
  0: 'gap-0',
  1: 'gap-1',
  2: 'gap-2',
  3: 'gap-3',
  4: 'gap-4',
  5: 'gap-5',
  6: 'gap-6',
  8: 'gap-8',
};

export function Stack({
  children,
  direction = 'column',
  gap = 4,
  align = 'stretch',
  justify = 'start',
  className,
}: StackProps) {
  return (
    <div
      className={cn(
        'flex',
        direction === 'row' ? 'flex-row' : 'flex-col',
        gapClasses[gap],
        `items-${align}`,
        `justify-${justify}`,
        className
      )}
    >
      {children}
    </div>
  );
}

export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack {...props} direction="row" />;
}

export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack {...props} direction="column" />;
}

export default Stack;
