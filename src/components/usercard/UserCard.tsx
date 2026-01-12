import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/media/Avatar';
import { StatusDot } from '@/components/statusdot/StatusDot';

interface UserCardProps {
  name: string;
  email?: string;
  avatar?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
  role?: string;
  onClick?: () => void;
  className?: string;
}

export function UserCard({ name, email, avatar, status, role, onClick, className }: UserCardProps) {
  return (
    <div onClick={onClick} className={cn('flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors', onClick && 'cursor-pointer', className)}>
      <div className="relative">
        <Avatar src={avatar} name={name} size="md" />
        {status && <StatusDot status={status} size="sm" className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{name}</p>
        {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
        {role && <p className="text-xs text-muted-foreground">{role}</p>}
      </div>
    </div>
  );
}

export default UserCard;
