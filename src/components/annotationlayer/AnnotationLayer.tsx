import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

interface AnnotationLayerProps {
  annotations: Annotation[];
  editable?: boolean;
  onAdd?: (annotation: Omit<Annotation, 'id'>) => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
  className?: string;
}

export function AnnotationLayer({ annotations, editable, onAdd, onSelect, selectedId, className }: AnnotationLayerProps) {
  const [drawing, setDrawing] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!editable) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDrawing({ startX: x, startY: y, x, y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setDrawing(d => ({ ...d!, x: ((e.clientX - rect.left) / rect.width) * 100, y: ((e.clientY - rect.top) / rect.height) * 100 }));
  };

  const handleMouseUp = () => {
    if (drawing && onAdd) {
      const x = Math.min(drawing.startX, drawing.x);
      const y = Math.min(drawing.startY, drawing.y);
      const width = Math.abs(drawing.x - drawing.startX);
      const height = Math.abs(drawing.y - drawing.startY);
      if (width > 2 && height > 2) onAdd({ x, y, width, height });
    }
    setDrawing(null);
  };

  return (
    <div className={cn('absolute inset-0', editable && 'cursor-crosshair', className)}
      onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={() => setDrawing(null)}>
      {annotations.map(a => (
        <div key={a.id} onClick={() => onSelect?.(a.id)}
          style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.width}%`, height: `${a.height}%`, borderColor: a.color || '#3b82f6' }}
          className={cn('absolute border-2 cursor-pointer', selectedId === a.id ? 'border-solid' : 'border-dashed')}>
          {a.label && <span className="absolute -top-5 left-0 text-xs px-1 bg-primary text-primary-foreground rounded">{a.label}</span>}
        </div>
      ))}
      {drawing && (
        <div className="absolute border-2 border-primary border-dashed bg-primary/10"
          style={{ left: `${Math.min(drawing.startX, drawing.x)}%`, top: `${Math.min(drawing.startY, drawing.y)}%`,
            width: `${Math.abs(drawing.x - drawing.startX)}%`, height: `${Math.abs(drawing.y - drawing.startY)}%` }} />
      )}
    </div>
  );
}

export default AnnotationLayer;
