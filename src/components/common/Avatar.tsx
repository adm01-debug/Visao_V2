import React from 'react';
import { cn } from '@/lib/utils';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getColor(name: string): string {
  const colors = [
    'bg-destructive', 'bg-warning', 'bg-accent', 'bg-warning/80',
    'bg-success/80', 'bg-success', 'bg-success/70', 'bg-primary/80',
    'bg-primary', 'bg-primary/70', 'bg-primary/90', 'bg-accent/80',
    'bg-accent/70', 'bg-primary/60', 'bg-accent/60', 'bg-destructive/80',
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index]!;
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center text-white font-medium',
        sizeClasses[size],
        getColor(name),
        className
      )}
      title={name}
    >
      {getInitials(name)}
    </div>
  );
}

export default Avatar;
