import React from 'react';
import { cn } from '@/lib/utils';

interface TextProps {
  children: React.ReactNode;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'default' | 'muted' | 'primary' | 'error';
  className?: string;
  as?: 'p' | 'span' | 'div';
}

const sizeClasses = { xs: 'text-xs', sm: 'text-sm', base: 'text-base', lg: 'text-lg', xl: 'text-xl' };
const weightClasses = { normal: 'font-normal', medium: 'font-medium', semibold: 'font-semibold', bold: 'font-bold' };
const colorClasses = { default: '', muted: 'text-muted-foreground', primary: 'text-primary', error: 'text-destructive' };

export function Text({ children, size = 'base', weight = 'normal', color = 'default', className, as = 'p' }: TextProps) {
  const Tag = as;
  return <Tag className={cn(sizeClasses[size], weightClasses[weight], colorClasses[color], className)}>{children}</Tag>;
}

export default Text;
