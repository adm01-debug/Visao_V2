import React from 'react';
import { cn } from '@/lib/utils';
import { Maximize2, X } from 'lucide-react';

interface ViewItem { id: string; src: string; label?: string; }

interface MultiViewProps {
  items: ViewItem[];
  layout?: '2x2' | '3x3' | '4x4' | '1+5';
  selectedId?: string;
  onSelect?: (id: string) => void;
  onMaximize?: (id: string) => void;
  onRemove?: (id: string) => void;
  className?: string;
}

const layoutGrids = { '2x2': 'grid-cols-2', '3x3': 'grid-cols-3', '4x4': 'grid-cols-4', '1+5': 'grid-cols-3' };

export function MultiView({ items, layout = '2x2', selectedId, onSelect, onMaximize, onRemove, className }: MultiViewProps) {
  return (
    <div className={cn('grid gap-1 bg-black p-1 rounded-lg', layoutGrids[layout], className)}>
      {items.map((item, i) => (
        <div key={item.id} onClick={() => onSelect?.(item.id)}
          className={cn('relative aspect-video bg-gray-900 rounded overflow-hidden cursor-pointer group',
            selectedId === item.id && 'ring-2 ring-primary',
            layout === '1+5' && i === 0 && 'col-span-2 row-span-2')}>
          <img src={item.src} alt={item.label || ''} className="w-full h-full object-cover" />
          {item.label && <div className="absolute bottom-0 left-0 right-0 p-1 bg-black/60"><span className="text-white text-xs">{item.label}</span></div>}
          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
            {onMaximize && <button onClick={e => { e.stopPropagation(); onMaximize(item.id); }} className="p-1 bg-black/60 rounded"><Maximize2 className="h-3 w-3 text-white" /></button>}
            {onRemove && <button onClick={e => { e.stopPropagation(); onRemove(item.id); }} className="p-1 bg-black/60 rounded"><X className="h-3 w-3 text-white" /></button>}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MultiView;
