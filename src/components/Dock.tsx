/**
 * macOS-style Dock
 */
import React, { useState } from 'react';
import { cn } from '@/utils/cn';
export interface DockItem { id: string; icon: React.ReactNode; label: string; onClick?: () => void; badge?: number; }
export const Dock: React.FC<{ items: DockItem[] }> = ({ items }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-end gap-1 p-2 bg-background/80 backdrop-blur-lg rounded-2xl border shadow-lg">
      {items.map((item, i) => {
        const isHovered = hoveredId === item.id;
        const isNear = hoveredId && Math.abs(items.findIndex(it => it.id === hoveredId) - i) === 1;
        return (
          <button key={item.id} onClick={item.onClick} onMouseEnter={() => setHoveredId(item.id)} onMouseLeave={() => setHoveredId(null)} className={cn('relative flex flex-col items-center transition-all duration-200', isHovered ? 'scale-150 -translate-y-4' : isNear ? 'scale-125 -translate-y-2' : '')}>
            <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-accent">{item.icon}</div>
            {item.badge && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{item.badge}</span>}
            {isHovered && <span className="absolute -top-8 px-2 py-1 bg-foreground text-background text-xs rounded whitespace-nowrap">{item.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
export default Dock;
