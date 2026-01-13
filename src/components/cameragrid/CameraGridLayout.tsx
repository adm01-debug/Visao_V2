import React from 'react';
import { cn } from '@/lib/utils';
import { Maximize2 } from 'lucide-react';

interface Camera { id: string; name: string; streamUrl?: string; status: 'online' | 'offline'; }
interface CameraGridLayoutProps { cameras: Camera[]; layout?: '1x1' | '2x2' | '3x3' | '4x4'; onSelect?: (camera: Camera) => void; className?: string; }

const layouts = { '1x1': 'grid-cols-1', '2x2': 'grid-cols-2', '3x3': 'grid-cols-3', '4x4': 'grid-cols-4' };

export function CameraGridLayout({ cameras, layout = '2x2', onSelect, className }: CameraGridLayoutProps) {
  return (
    <div className={cn('grid gap-2', layouts[layout], className)}>
      {cameras.map(cam => (
        <div key={cam.id} className="relative aspect-video bg-black rounded-lg overflow-hidden group cursor-pointer" onClick={() => onSelect?.(cam)}>
          <div className="absolute inset-0 flex items-center justify-center text-white/50">
            {cam.status === 'offline' ? 'Offline' : 'Stream'}
          </div>
          <div className="absolute top-2 left-2 flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full', cam.status === 'online' ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-xs text-white bg-black/50 px-1 rounded">{cam.name}</span>
          </div>
          <button className="absolute top-2 right-2 p-1 bg-black/50 rounded opacity-0 group-hover:opacity-100 transition">
            <Maximize2 className="h-4 w-4 text-white" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default CameraGridLayout;
