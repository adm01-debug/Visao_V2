import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface Action { icon: React.ReactNode; label: string; onClick: () => void; }

interface FloatingActionButtonProps {
  actions: Action[];
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

const positions = {
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4'
};

export function FloatingActionButton({ actions, position = 'bottom-right', className }: FloatingActionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('fixed z-50', positions[position], className)}>
      <div className={cn('flex flex-col-reverse gap-2 mb-2 transition-all', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        {actions.map((action, i) => (
          <button key={i} onClick={() => { action.onClick(); setOpen(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-transform"
            style={{ transform: open ? 'scale(1)' : 'scale(0.8)' }}>
            {action.icon}<span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-transform"
        style={{ transform: open ? 'rotate(45deg)' : 'rotate(0)' }}>
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </button>
    </div>
  );
}

export default FloatingActionButton;
