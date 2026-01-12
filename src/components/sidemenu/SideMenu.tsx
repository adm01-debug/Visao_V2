import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: number;
  children?: MenuItem[];
}

interface SideMenuProps {
  items: MenuItem[];
  activeId?: string;
  collapsed?: boolean;
  onItemClick?: (item: MenuItem) => void;
  className?: string;
}

export function SideMenu({ items, activeId, collapsed = false, onItemClick, className }: SideMenuProps) {
  const [expanded, setExpanded] = React.useState<string[]>([]);

  const toggle = (id: string) => {
    setExpanded(e => e.includes(id) ? e.filter(i => i !== id) : [...e, id]);
  };

  const renderItem = (item: MenuItem, level = 0) => {
    const isActive = item.id === activeId;
    const isExpanded = expanded.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <div key={item.id}>
        <button onClick={() => hasChildren ? toggle(item.id) : onItemClick?.(item)}
          className={cn('w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
            isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent',
            level > 0 && 'ml-4')}>
          {item.icon}
          {!collapsed && <span className="flex-1 text-left text-sm">{item.label}</span>}
          {item.badge && <span className="px-1.5 py-0.5 text-xs rounded-full bg-red-500 text-white">{item.badge}</span>}
          {hasChildren && !collapsed && <ChevronRight className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-90')} />}
        </button>
        {hasChildren && isExpanded && !collapsed && item.children!.map(c => renderItem(c, level + 1))}
      </div>
    );
  };

  return <nav className={cn('space-y-1', className)}>{items.map(i => renderItem(i))}</nav>;
}

export default SideMenu;
