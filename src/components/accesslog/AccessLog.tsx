import React from 'react';
import { cn } from '@/lib/utils';
import { LogIn, LogOut, Shield, User } from 'lucide-react';
import { Avatar } from '@/components/media/Avatar';

interface AccessEntry {
  id: string;
  type: 'entry' | 'exit';
  user: { name: string; avatar?: string };
  location: string;
  timestamp: Date;
  method: 'card' | 'face' | 'pin' | 'manual';
}

interface AccessLogProps {
  entries: AccessEntry[];
  maxHeight?: string;
  className?: string;
}

const methodLabels = { card: 'Cartão', face: 'Facial', pin: 'PIN', manual: 'Manual' };

export function AccessLog({ entries, maxHeight = '400px', className }: AccessLogProps) {
  return (
    <div className={cn('space-y-2 overflow-y-auto', className)} style={{ maxHeight }}>
      {entries.map(entry => (
        <div key={entry.id} className="flex items-center gap-3 p-3 rounded-lg border">
          <div className={cn('p-2 rounded-full', entry.type === 'entry' ? 'bg-green-100' : 'bg-red-100')}>
            {entry.type === 'entry' ? <LogIn className="h-4 w-4 text-green-600" /> : <LogOut className="h-4 w-4 text-red-600" />}
          </div>
          <Avatar src={entry.user.avatar} name={entry.user.name} size="sm" />
          <div className="flex-1">
            <p className="font-medium text-sm">{entry.user.name}</p>
            <p className="text-xs text-muted-foreground">{entry.location}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{entry.timestamp.toLocaleTimeString('pt-BR')}</p>
            <p className="text-xs text-muted-foreground">{methodLabels[entry.method]}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AccessLog;
