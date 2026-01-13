import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface DrawerProps { open: boolean; onClose: () => void; side?: 'left' | 'right'; children: React.ReactNode; className?: string; }

export function Drawer({ open, onClose, side = 'right', children, className }: DrawerProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('absolute top-0 bottom-0 w-80 max-w-full bg-background shadow-xl transition-transform',
        side === 'right' ? 'right-0' : 'left-0', className)}>
        <button onClick={onClose} className="absolute top-4 right-4"><X className="h-5 w-5" /></button>
        <div className="p-6 pt-12 h-full overflow-auto">{children}</div>
      </div>
    </div>
  );
}

export default Drawer;
