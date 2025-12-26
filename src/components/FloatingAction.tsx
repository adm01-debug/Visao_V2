/**
 * Floating Action Button
 */
import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/utils/cn';
export interface FloatingActionItem { icon: React.ReactNode; label: string; onClick: () => void; }
export const FloatingAction: React.FC<{ items: FloatingActionItem[] }> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className={cn('flex flex-col-reverse gap-2 mb-2 transition-all', isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
        {items.map((item, i) => (<button key={i} onClick={() => { item.onClick(); setIsOpen(false); }} className="flex items-center gap-2 px-4 py-2 bg-background rounded-full shadow-lg hover:bg-accent"><span className="text-sm">{item.label}</span>{item.icon}</button>))}
      </div>
      <button onClick={() => setIsOpen(!isOpen)} className={cn('w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform', isOpen && 'rotate-45')}><Plus className="h-6 w-6" /></button>
    </div>
  );
};
export default FloatingAction;
