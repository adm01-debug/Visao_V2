import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  position?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = { sm: 'w-64', md: 'w-80', lg: 'w-96' };
const positionClasses = {
  left: 'left-0 rounded-r-lg',
  right: 'right-0 rounded-l-lg',
};

export function Drawer({ isOpen, onClose, title, children, position = 'right', size = 'md' }: DrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('fixed top-0 h-full bg-background shadow-lg p-6 overflow-y-auto', sizeClasses[size], positionClasses[position])}>
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Drawer;
