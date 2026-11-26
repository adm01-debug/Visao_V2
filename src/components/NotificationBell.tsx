import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationBell = React.forwardRef<HTMLButtonElement>(
  function NotificationBell(_props, _ref) {
    const { unreadCount } = useNotifications();
    const badgeText = unreadCount > 9 ? '9+' : String(unreadCount);
    return (
      <Button variant="ghost" size="icon" className="relative">
        <span className="sr-only">
          {unreadCount > 0 ? `Notificações não lidas: ${badgeText}` : 'Notificações'}
        </span>
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center"
          >
            {badgeText}
          </span>
        )}
      </Button>
    );
  }
);

export default NotificationBell;
