import React from 'react';
import { cn } from '@/lib/utils';
import { Monitor, Smartphone, Globe, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Session {
  id: string;
  device: 'desktop' | 'mobile' | 'web';
  browser: string;
  ip: string;
  location?: string;
  lastActive: Date;
  current?: boolean;
}

interface SessionListProps {
  sessions: Session[];
  onRevoke?: (sessionId: string) => void;
  className?: string;
}

const deviceIcons = { desktop: Monitor, mobile: Smartphone, web: Globe };

export function SessionList({ sessions, onRevoke, className }: SessionListProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {sessions.map(session => {
        const Icon = deviceIcons[session.device];
        return (
          <div key={session.id} className={cn('flex items-center gap-3 p-3 rounded-lg border', session.current && 'bg-primary/5 border-primary')}>
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{session.browser}</span>
                {session.current && <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded">Atual</span>}
              </div>
              <p className="text-xs text-muted-foreground">{session.ip}{session.location && ` • ${session.location}`}</p>
              <p className="text-xs text-muted-foreground">Última atividade: {session.lastActive.toLocaleString('pt-BR')}</p>
            </div>
            {!session.current && onRevoke && (
              <Button variant="ghost" size="sm" onClick={() => onRevoke(session.id)}><X className="h-4 w-4" /></Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default SessionList;
