import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Tab { id: string; label: string; content: React.ReactNode; }
interface AnimatedTabsProps { tabs: Tab[]; defaultTab?: string; className?: string; }

export function AnimatedTabs({ tabs, defaultTab, className }: AnimatedTabsProps) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <div className="relative flex gap-1 p-1 rounded-lg bg-muted">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)}
            className={cn('relative z-10 px-4 py-2 text-sm font-medium rounded-md transition-colors',
              active === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground')}>
            {tab.label}
          </button>
        ))}
        <div className="absolute top-1 bottom-1 bg-background rounded-md shadow transition-all"
          style={{ left: `${tabs.findIndex(t => t.id === active) * (100 / tabs.length)}%`, width: `${100 / tabs.length}%` }} />
      </div>
      <div className="mt-4">{tabs.find(t => t.id === active)?.content}</div>
    </div>
  );
}

export default AnimatedTabs;
