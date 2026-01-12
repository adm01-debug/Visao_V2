import React from 'react';
import { cn } from '@/lib/utils';

interface CenterBoxProps {
  children: React.ReactNode;
  fullScreen?: boolean;
  className?: string;
}

export function CenterBox({ children, fullScreen = false, className }: CenterBoxProps) {
  return (
    <div className={cn('flex items-center justify-center', fullScreen && 'min-h-screen', className)}>
      {children}
    </div>
  );
}

export default CenterBox;
