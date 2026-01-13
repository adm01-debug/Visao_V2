import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ResizablePanelProps { children: React.ReactNode; defaultWidth?: number; minWidth?: number; maxWidth?: number; className?: string; }

export function ResizablePanel({ children, defaultWidth = 300, minWidth = 200, maxWidth = 600, className }: ResizablePanelProps) {
  const [width, setWidth] = useState(defaultWidth);
  const dragging = useRef(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging.current) return;
    setWidth(Math.min(maxWidth, Math.max(minWidth, e.clientX)));
  };

  const startDrag = () => {
    dragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', () => { dragging.current = false; }, { once: true });
  };

  return (
    <div className={cn('relative', className)} style={{ width }}>
      {children}
      <div onMouseDown={startDrag} className="absolute top-0 right-0 bottom-0 w-1 bg-border hover:bg-primary cursor-col-resize" />
    </div>
  );
}

export default ResizablePanel;
