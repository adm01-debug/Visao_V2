import React from 'react';
import { cn } from '@/lib/utils';
import { Home, Settings, Users, BarChart, FileText, HelpCircle, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

interface SidebarItem { icon: React.ReactNode; label: string; href?: string; active?: boolean; }
interface SidebarProps { items: SidebarItem[]; collapsed?: boolean; onToggle?: () => void; logo?: React.ReactNode; className?: string; }

export function Sidebar({ items, collapsed = false, onToggle, logo, className }: SidebarProps) {
  return (
    <aside className={cn('h-screen bg-card border-r flex flex-col transition-all', collapsed ? 'w-16' : 'w-64', className)}>
      <div className="h-16 flex items-center justify-between px-4 border-b">
        {!collapsed && logo}
        <button onClick={onToggle} className="p-2 hover:bg-accent rounded-lg">{collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}</button>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {items.map((item, i) => (
          <a key={i} href={item.href} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg transition-colors', item.active ? 'bg-primary text-primary-foreground' : 'hover:bg-accent')}>
            {item.icon}
            {!collapsed && <span className="text-sm">{item.label}</span>}
          </a>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
