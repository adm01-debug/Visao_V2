import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  name?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({ src, alt, name, size = 'md', className }: AvatarProps) {
  const [error, setError] = React.useState(false);

  if (src && !error) {
    return (
      <img
        src={src}
        alt={alt || name || 'Avatar'}
        onError={() => setError(true)}
        className={cn('rounded-full object-cover', sizeClasses[size], className)}
      />
    );
  }

  if (name) {
    return (
      <div className={cn('rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium', sizeClasses[size], className)}>
        {getInitials(name)}
      </div>
    );
  }

  return (
    <div className={cn('rounded-full bg-muted flex items-center justify-center', sizeClasses[size], className)}>
      <User className="h-1/2 w-1/2 text-muted-foreground" />
    </div>
  );
}

export default Avatar;
