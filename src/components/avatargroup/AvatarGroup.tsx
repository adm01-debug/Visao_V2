import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/media/Avatar';

interface AvatarGroupProps {
  avatars: { src?: string; name?: string }[];
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AvatarGroup({ avatars, max = 4, size = 'md', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max);
  const overflow = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((a, i) => (
        <Avatar key={i} src={a.src} name={a.name} size={size} className="ring-2 ring-background" />
      ))}
      {overflow > 0 && (
        <div className={cn(
          'flex items-center justify-center rounded-full bg-muted ring-2 ring-background text-xs font-medium',
          size === 'sm' ? 'h-8 w-8' : size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'
        )}>
          +{overflow}
        </div>
      )}
    </div>
  );
}

export default AvatarGroup;
