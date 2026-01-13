import React from 'react';
import { cn } from '@/lib/utils';
import { Bell, Search, Settings, User, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TopbarProps { user?: { name: string; avatar?: string; role?: string }; notifications?: number; onSearch?: (query: string) => void; onNotifications?: () => void; onSettings?: () => void; onProfile?: () => void; className?: string; }

export function Topbar({ user, notifications = 0, onSearch, onNotifications, onSettings, onProfile, className }: TopbarProps) {
  return (
    <header className={cn('h-16 border-b bg-background flex items-center justify-between px-6', className)}>
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input type="search" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-muted/50" onChange={e => onSearch?.(e.target.value)} />
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onNotifications} className="relative p-2 hover:bg-accent rounded-lg">
          <Bell className="h-5 w-5" />
          {notifications > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{notifications}</span>}
        </button>
        <button onClick={onSettings} className="p-2 hover:bg-accent rounded-lg"><Settings className="h-5 w-5" /></button>
        {user && (
          <button onClick={onProfile} className="flex items-center gap-2 p-2 hover:bg-accent rounded-lg">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">{user.avatar ? <img src={user.avatar} className="w-full h-full rounded-full object-cover" /> : <User className="h-4 w-4" />}</div>
            <div className="text-left hidden md:block"><p className="text-sm font-medium">{user.name}</p>{user.role && <p className="text-xs text-muted-foreground">{user.role}</p>}</div>
            <ChevronDown className="h-4 w-4 hidden md:block" />
          </button>
        )}
      </div>
    </header>
  );
}

export default Topbar;
