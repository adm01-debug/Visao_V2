import React, { createContext, useContext, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface AccordionContextType {
  expandedItems: string[];
  toggle: (value: string) => void;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

export function Accordion({ children, className, multiple = false }: { children: React.ReactNode; className?: string; multiple?: boolean }) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const toggle = (value: string) => {
    setExpandedItems(prev => {
      if (prev.includes(value)) return prev.filter(v => v !== value);
      return multiple ? [...prev, value] : [value];
    });
  };

  return (
    <AccordionContext.Provider value={{ expandedItems, toggle }}>
      <div className={cn('divide-y', className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export function AccordionTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = useContext(AccordionContext);
  if (!context) return null;

  const isExpanded = context.expandedItems.includes(value);

  return (
    <button onClick={() => context.toggle(value)} className={cn('flex w-full items-center justify-between py-4 font-medium transition-all hover:underline', className)}>
      {children}
      <ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
    </button>
  );
}

export function AccordionContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const context = useContext(AccordionContext);
  if (!context || !context.expandedItems.includes(value)) return null;

  return <div className={cn('pb-4 text-sm', className)}>{children}</div>;
}

export default Accordion;
