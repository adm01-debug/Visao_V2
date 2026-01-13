import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface Zone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name: string;
}

interface MotionZoneEditorProps {
  zones?: Zone[];
  onChange?: (zones: Zone[]) => void;
  className?: string;
}

export function MotionZoneEditor({ zones = [], onChange, className }: MotionZoneEditorProps) {
  const [drawing, setDrawing] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDrawing(true);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!drawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.min(start.x, e.clientX - rect.left);
    const y = Math.min(start.y, e.clientY - rect.top);
    const newZone: Zone = {
      id: Date.now().toString(),
      x,
      y,
      width: Math.abs(e.clientX - rect.left - start.x),
      height: Math.abs(e.clientY - rect.top - start.y),
      name: `Zona ${zones.length + 1}`,
    };
    onChange?.([...zones, newZone]);
    setDrawing(false);
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative bg-black aspect-video rounded-lg overflow-hidden cursor-crosshair', className)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {zones.map(z => (
        <div
          key={z.id}
          className="absolute border-2 border-yellow-400 bg-yellow-400/20"
          style={{ left: z.x, top: z.y, width: z.width, height: z.height }}
        >
          <span className="absolute -top-5 left-0 text-xs bg-yellow-400 text-black px-1">
            {z.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export default MotionZoneEditor;
