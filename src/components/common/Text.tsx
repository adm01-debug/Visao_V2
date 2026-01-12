import React from 'react';
import { cn } from '@/lib/utils';

interface TextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'default' | 'muted' | 'primary' | 'error';
  as?: 'p' | 'span' | 'div';
  className?: string;
}

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const weightClasses = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

const colorClasses = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  primary: 'text-primary',
  error: 'text-destructive',
};

export function Text({
  children, size = 'base', weight = 'normal', color = 'default',
  as: Component = 'p', className
}: TextProps) {
  return (
    <Component className={cn(sizeClasses[size], weightClasses[weight], colorClasses[color], className)}>
      {children}
    </Component>
  );
}

export default Text;
