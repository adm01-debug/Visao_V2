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
    'bg-destructive', 'bg-warning', 'bg-amber-500', 'bg-warning',
    'bg-lime-500', 'bg-success', 'bg-emerald-500', 'bg-teal-500',
    'bg-primary', 'bg-sky-500', 'bg-primary', 'bg-indigo-500',
    'bg-violet-500', 'bg-primary', 'bg-fuchsia-500', 'bg-pink-500',
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
