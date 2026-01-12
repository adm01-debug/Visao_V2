import React, { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightCardProps { children: React.ReactNode; className?: string; }

export function SpotlightCard({ children, className }: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={ref} onMouseMove={handleMouseMove} className={cn('relative overflow-hidden rounded-lg border bg-card', className)}>
      <div className="pointer-events-none absolute -inset-px opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: `radial-gradient(400px circle at ${pos.x}px ${pos.y}px, rgba(var(--primary), 0.1), transparent 40%)` }} />
      {children}
    </div>
  );
}

export default SpotlightCard;
