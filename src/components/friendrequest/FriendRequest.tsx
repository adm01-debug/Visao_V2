import React from 'react';
import { cn } from '@/lib/utils';
import { UserPlus, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FriendRequestProps { user: { name: string; avatar?: string; mutualFriends?: number }; onAccept?: () => void; onDecline?: () => void; className?: string; }

export function FriendRequest({ user, onAccept, onDecline, className }: FriendRequestProps) {
  return (
    <div className={cn('flex items-center gap-3 p-3 rounded-lg border bg-card', className)}>
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center shrink-0">{user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : user.name[0]}</div>
      <div className="flex-1 min-w-0"><p className="font-medium truncate">{user.name}</p>{user.mutualFriends && <p className="text-sm text-muted-foreground">{user.mutualFriends} amigos em comum</p>}</div>
      <div className="flex gap-2">
        <Button size="sm" onClick={onAccept}><Check className="h-4 w-4" /></Button>
        <Button size="sm" variant="outline" onClick={onDecline}><X className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export default FriendRequest;
