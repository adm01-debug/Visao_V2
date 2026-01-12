import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface NotificationItemProps {
  title: string;
  message: string;
  timestamp: string;
  read?: boolean;
  icon?: React.ReactNode;
  onDismiss?: () => void;
  onClick?: () => void;
  className?: string;
}

export function NotificationItem({ title, message, timestamp, read = false, icon, onDismiss, onClick, className }: NotificationItemProps) {
  return (
    <div onClick={onClick} className={cn('flex items-start gap-3 p-3 rounded-lg border transition-colors', !read && 'bg-primary/5', onClick && 'cursor-pointer hover:bg-accent/50', className)}>
      {icon && <div className="mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{title}</p>
          {!read && <span className="h-2 w-2 rounded-full bg-primary" />}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">{timestamp}</p>
      </div>
      {onDismiss && <button onClick={(e) => { e.stopPropagation(); onDismiss(); }}><X className="h-4 w-4 text-muted-foreground" /></button>}
    </div>
  );
}

export default NotificationItem;
