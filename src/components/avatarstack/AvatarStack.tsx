import React from 'react';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarStackProps { avatars: { src?: string; name: string }[]; max?: number; size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };

export function AvatarStack({ avatars, max = 4, size = 'md', className }: AvatarStackProps) {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((a, i) => (
        <div key={i} className={cn('rounded-full border-2 border-background bg-muted flex items-center justify-center', sizes[size])}>
          {a.src ? <img src={a.src} alt={a.name} className="w-full h-full rounded-full object-cover" /> : <span className="text-xs font-medium">{a.name[0]}</span>}
        </div>
      ))}
      {remaining > 0 && <div className={cn('rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs font-medium', sizes[size])}>+{remaining}</div>}
    </div>
  );
}

export default AvatarStack;
