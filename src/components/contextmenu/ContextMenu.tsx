import React, { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MenuItem { label: string; icon?: React.ReactNode; onClick: () => void; disabled?: boolean; divider?: boolean; }

interface ContextMenuProps {
  items: MenuItem[];
  children: React.ReactNode;
  className?: string;
}

export function ContextMenu({ items, children, className }: ContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  useEffect(() => {
    const handleClick = () => setVisible(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      <div onContextMenu={handleContextMenu} className={className}>{children}</div>
      {visible && (
        <div className="fixed z-50 min-w-[160px] rounded-lg border bg-popover p-1 shadow-lg" style={{ left: position.x, top: position.y }}>
          {items.map((item, i) => item.divider ? (
            <div key={i} className="h-px bg-border my-1" />
          ) : (
            <button key={i} onClick={() => { item.onClick(); setVisible(false); }} disabled={item.disabled}
              className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm rounded hover:bg-accent', item.disabled && 'opacity-50 cursor-not-allowed')}>
              {item.icon}{item.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export default ContextMenu;
