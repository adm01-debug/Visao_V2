import React from 'react';
import { cn } from '@/lib/utils';
import { Menu, Bell, User, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TopBarProps {
  title?: string;
  onMenuClick?: () => void;
  onNotificationClick?: () => void;
  onProfileClick?: () => void;
  notificationCount?: number;
  showSearch?: boolean;
  onSearch?: (query: string) => void;
  className?: string;
}

export function TopBar({ title, onMenuClick, onNotificationClick, onProfileClick, notificationCount, showSearch, onSearch, className }: TopBarProps) {
  return (
    <header className={cn('flex items-center gap-4 px-4 h-14 border-b bg-background', className)}>
      {onMenuClick && <Button variant="ghost" size="icon" onClick={onMenuClick}><Menu className="h-5 w-5" /></Button>}
      {title && <h1 className="font-semibold">{title}</h1>}
      {showSearch && (
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." className="pl-9" onChange={e => onSearch?.(e.target.value)} />
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {onNotificationClick && (
          <Button variant="ghost" size="icon" className="relative" onClick={onNotificationClick}>
            <Bell className="h-5 w-5" />
            {notificationCount && notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">{notificationCount}</span>
            )}
          </Button>
        )}
        {onProfileClick && <Button variant="ghost" size="icon" onClick={onProfileClick}><User className="h-5 w-5" /></Button>}
      </div>
    </header>
  );
}

export default TopBar;
