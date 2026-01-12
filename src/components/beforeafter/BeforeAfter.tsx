import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface BeforeAfterProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function BeforeAfter({ beforeSrc, afterSrc, beforeLabel = 'Antes', afterLabel = 'Depois', className }: BeforeAfterProps) {
  const [position, setPosition] = useState(50);

  return (
    <div className={cn('relative overflow-hidden rounded-lg select-none', className)}>
      <img src={afterSrc} alt={afterLabel} className="w-full h-full object-cover" />
      <div className="absolute inset-0 overflow-hidden" style={{ width: `${position}%` }}>
        <img src={beforeSrc} alt={beforeLabel} className="w-full h-full object-cover" style={{ width: `${10000/position}%` }} />
      </div>
      <div className="absolute inset-y-0 w-1 bg-white shadow-lg cursor-ew-resize" style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
        onMouseDown={e => {
          const container = e.currentTarget.parentElement!;
          const move = (ev: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            setPosition(Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100)));
          };
          const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
          document.addEventListener('mousemove', move);
          document.addEventListener('mouseup', up);
        }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
          <span className="text-lg">⟷</span>
        </div>
      </div>
      <span className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded">{beforeLabel}</span>
      <span className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">{afterLabel}</span>
    </div>
  );
}

export default BeforeAfter;
