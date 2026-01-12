import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Home, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PTZControlsProps {
  onPan: (direction: 'left' | 'right') => void;
  onTilt: (direction: 'up' | 'down') => void;
  onZoom: (direction: 'in' | 'out') => void;
  onHome?: () => void;
  onReset?: () => void;
  disabled?: boolean;
  className?: string;
}

export function PTZControls({ onPan, onTilt, onZoom, onHome, onReset, disabled = false, className }: PTZControlsProps) {
  return (
    <div className={cn('flex flex-col items-center gap-2 p-3 bg-card rounded-lg border', className)}>
      <div className="grid grid-cols-3 gap-1">
        <div />
        <Button variant="outline" size="icon" disabled={disabled} onClick={() => onTilt('up')}><ChevronUp className="h-4 w-4" /></Button>
        <div />
        <Button variant="outline" size="icon" disabled={disabled} onClick={() => onPan('left')}><ChevronLeft className="h-4 w-4" /></Button>
        {onHome ? <Button variant="outline" size="icon" disabled={disabled} onClick={onHome}><Home className="h-4 w-4" /></Button> : <div />}
        <Button variant="outline" size="icon" disabled={disabled} onClick={() => onPan('right')}><ChevronRight className="h-4 w-4" /></Button>
        <div />
        <Button variant="outline" size="icon" disabled={disabled} onClick={() => onTilt('down')}><ChevronDown className="h-4 w-4" /></Button>
        <div />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="icon" disabled={disabled} onClick={() => onZoom('out')}><ZoomOut className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" disabled={disabled} onClick={() => onZoom('in')}><ZoomIn className="h-4 w-4" /></Button>
        {onReset && <Button variant="outline" size="icon" disabled={disabled} onClick={onReset}><RotateCcw className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

export default PTZControls;
