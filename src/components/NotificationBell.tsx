import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationBell = React.forwardRef<HTMLButtonElement>(function NotificationBell(_props, _ref) {
  const { unreadCount } = useNotifications();
  return (
    <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notificações (${unreadCount} não lidas)` : "Notificações"}>
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Button>
  );
});

export default NotificationBell;
