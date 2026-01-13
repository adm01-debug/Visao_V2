import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PTZControlProps { onMove?: (direction: string) => void; onZoom?: (direction: 'in' | 'out') => void; onHome?: () => void; className?: string; }

export function PTZControl({ onMove, onZoom, onHome, className }: PTZControlProps) {
  return (
    <div className={cn('inline-flex flex-col items-center gap-2 p-4 rounded-lg bg-card border', className)}>
      <Button variant="outline" size="icon" onClick={() => onMove?.('up')}><ChevronUp className="h-5 w-5" /></Button>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={() => onMove?.('left')}><ChevronLeft className="h-5 w-5" /></Button>
        <Button variant="outline" size="icon" onClick={onHome}><Home className="h-5 w-5" /></Button>
        <Button variant="outline" size="icon" onClick={() => onMove?.('right')}><ChevronRight className="h-5 w-5" /></Button>
      </div>
      <Button variant="outline" size="icon" onClick={() => onMove?.('down')}><ChevronDown className="h-5 w-5" /></Button>
      <div className="flex gap-2 mt-2">
        <Button variant="outline" size="icon" onClick={() => onZoom?.('out')}><ZoomOut className="h-5 w-5" /></Button>
        <Button variant="outline" size="icon" onClick={() => onZoom?.('in')}><ZoomIn className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}

export default PTZControl;
