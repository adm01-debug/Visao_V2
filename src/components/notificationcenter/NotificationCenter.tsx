import React from 'react';
import { cn } from '@/lib/utils';
import { Bell, Check, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Notification { id: string; title: string; message: string; time: Date; read: boolean; type: 'info' | 'warning' | 'error' | 'success'; }

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onDelete?: (id: string) => void;
  onSettings?: () => void;
  className?: string;
}

const typeColors = { info: 'border-l-blue-500', warning: 'border-l-yellow-500', error: 'border-l-red-500', success: 'border-l-green-500' };

export function NotificationCenter({ notifications, onMarkRead, onMarkAllRead, onDelete, onSettings, className }: NotificationCenterProps) {
  const unread = notifications.filter(n => !n.read).length;

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <span className="font-medium">Notificações</span>
          {unread > 0 && <span className="px-2 py-0.5 text-xs rounded-full bg-red-500 text-white">{unread}</span>}
        </div>
        <div className="flex gap-1">
          {onMarkAllRead && <Button variant="ghost" size="sm" onClick={onMarkAllRead}><Check className="h-4 w-4" /></Button>}
          {onSettings && <Button variant="ghost" size="sm" onClick={onSettings}><Settings className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div className="max-h-96 overflow-auto">
        {notifications.length === 0 ? (
          <p className="p-4 text-center text-muted-foreground text-sm">Nenhuma notificação</p>
        ) : notifications.map(n => (
          <div key={n.id} className={cn('p-3 border-b border-l-4 last:border-b-0', typeColors[n.type], !n.read && 'bg-muted/30')}>
            <div className="flex justify-between items-start">
              <p className="font-medium text-sm">{n.title}</p>
              <div className="flex gap-1">
                {!n.read && onMarkRead && <button onClick={() => onMarkRead(n.id)} className="text-muted-foreground hover:text-foreground"><Check className="h-3 w-3" /></button>}
                {onDelete && <button onClick={() => onDelete(n.id)} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-3 w-3" /></button>}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{n.time.toLocaleString('pt-BR')}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationCenter;
