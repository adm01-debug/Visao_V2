import React from 'react';
import { cn } from '@/lib/utils';

interface AspectRatioProps {
  ratio?: '1:1' | '4:3' | '16:9' | '21:9';
  children: React.ReactNode;
  className?: string;
}

const ratioClasses = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '21:9': 'aspect-[21/9]',
};

export function AspectRatio({ ratio = '16:9', children, className }: AspectRatioProps) {
  return <div className={cn('relative overflow-hidden', ratioClasses[ratio], className)}>{children}</div>;
}

export default AspectRatio;
