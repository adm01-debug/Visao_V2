import React from 'react';
import { cn } from '@/lib/utils';

interface NavItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface BottomNavProps {
  items: NavItem[];
  activeItem: string;
  onChange: (key: string) => void;
  className?: string;
}

export function BottomNav({ items, activeItem, onChange, className }: BottomNavProps) {
  return (
    <nav className={cn('fixed bottom-0 left-0 right-0 bg-background border-t flex justify-around py-2 z-40', className)}>
      {items.map(item => (
        <button key={item.key} onClick={() => onChange(item.key)}
          className={cn('flex flex-col items-center gap-1 px-3 py-1 min-w-[64px]',
            activeItem === item.key ? 'text-primary' : 'text-muted-foreground')}>
          <div className="relative">
            {item.icon}
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-bold bg-destructive text-white rounded-full flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </div>
          <span className="text-xs">{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default BottomNav;
