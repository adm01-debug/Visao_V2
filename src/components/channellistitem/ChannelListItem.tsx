import React from 'react';
import { cn } from '@/lib/utils';
import { Hash, AtSign, Users } from 'lucide-react';

interface ChannelListItemProps { name: string; type: 'text' | 'voice' | 'dm'; unread?: number; active?: boolean; onClick?: () => void; className?: string; }

const icons = { text: Hash, voice: Users, dm: AtSign };

export function ChannelListItem({ name, type, unread, active, onClick, className }: ChannelListItemProps) {
  const Icon = icons[type];
  return (
    <button onClick={onClick} className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors', active ? 'bg-primary/10 text-primary' : 'hover:bg-accent', className)}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{name}</span>
      {unread && unread > 0 && <span className="px-1.5 py-0.5 bg-primary text-primary-foreground text-xs rounded-full">{unread}</span>}
    </button>
  );
}

export default ChannelListItem;
