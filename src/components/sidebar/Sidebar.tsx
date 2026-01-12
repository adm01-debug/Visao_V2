import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right';
  width?: string;
  className?: string;
}

export function Sidebar({ isOpen, onClose, children, position = 'left', width = 'w-64', className }: SidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <aside className={cn(
        'fixed top-0 h-full bg-background z-50 shadow-lg transition-transform',
        width,
        position === 'left' ? 'left-0' : 'right-0',
        className
      )}>
        <button onClick={onClose} className="absolute top-4 right-4">
          <X className="h-5 w-5" />
        </button>
        <div className="p-4 pt-12">{children}</div>
      </aside>
    </>
  );
}

export default Sidebar;
