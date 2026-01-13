import React from 'react';
import { cn } from '@/lib/utils';
import { Layers, Eye, EyeOff, Lock, Trash2 } from 'lucide-react';

interface Layer { id: string; name: string; visible: boolean; locked: boolean; }
interface LayerPanelProps { layers: Layer[]; selectedId?: string; onSelect: (id: string) => void; onToggleVisibility: (id: string) => void; onToggleLock: (id: string) => void; onDelete: (id: string) => void; className?: string; }

export function LayerPanel({ layers, selectedId, onSelect, onToggleVisibility, onToggleLock, onDelete, className }: LayerPanelProps) {
  return (
    <div className={cn('p-3 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b"><Layers className="h-4 w-4" /><span className="font-medium text-sm">Camadas</span></div>
      <div className="space-y-1">
        {layers.map(l => (
          <div key={l.id} onClick={() => onSelect(l.id)} className={cn('flex items-center gap-2 p-2 rounded cursor-pointer', selectedId === l.id ? 'bg-primary/10' : 'hover:bg-accent')}>
            <button onClick={e => { e.stopPropagation(); onToggleVisibility(l.id); }}>{l.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}</button>
            <span className={cn('flex-1 text-sm truncate', !l.visible && 'text-muted-foreground')}>{l.name}</span>
            <button onClick={e => { e.stopPropagation(); onToggleLock(l.id); }}><Lock className={cn('h-4 w-4', l.locked ? 'text-yellow-500' : 'text-muted-foreground')} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(l.id); }}><Trash2 className="h-4 w-4 text-red-500" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LayerPanel;
