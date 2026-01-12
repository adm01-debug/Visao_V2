import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const paddingClasses = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' };
const shadowClasses = { none: '', sm: 'shadow-sm', md: 'shadow', lg: 'shadow-lg' };

export function Card({ children, className, padding = 'md', shadow = 'sm', hover = false }: CardProps) {
  return (
    <div className={cn(
      'bg-card rounded-lg border',
      paddingClasses[padding],
      shadowClasses[shadow],
      hover && 'transition-shadow hover:shadow-md',
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4', className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold', className)}>{children}</h3>;
}

export function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-4 pt-4 border-t', className)}>{children}</div>;
}

export default Card;
