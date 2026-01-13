import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface FloatingTooltipProps { content: React.ReactNode; children: React.ReactNode; position?: 'top' | 'bottom' | 'left' | 'right'; delay?: number; className?: string; }

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

export function FloatingTooltip({ content, children, position = 'top', delay = 200, className }: FloatingTooltipProps) {
  const [show, setShow] = useState(false);
  let timeout: ReturnType<typeof setTimeout>;

  const handleEnter = () => { timeout = setTimeout(() => setShow(true), delay); };
  const handleLeave = () => { clearTimeout(timeout); setShow(false); };

  return (
    <div className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && (
        <div className={cn('absolute z-50 px-2 py-1 text-sm bg-popover border rounded shadow-lg whitespace-nowrap', positions[position], className)}>
          {content}
        </div>
      )}
    </div>
  );
}

export default FloatingTooltip;
