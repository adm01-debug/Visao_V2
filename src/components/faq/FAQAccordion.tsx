import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, HelpCircle } from 'lucide-react';

interface FAQ { id: string; question: string; answer: string; }
interface FAQAccordionProps { items: FAQ[]; className?: string; }

export function FAQAccordion({ items, className }: FAQAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className={cn('space-y-2', className)}>
      {items.map(item => (
        <div key={item.id} className="rounded-lg border">
          <button onClick={() => setOpenId(openId === item.id ? null : item.id)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-accent/50 rounded-lg">
            <span className="flex items-center gap-2 font-medium"><HelpCircle className="h-4 w-4 text-primary" />{item.question}</span>
            <ChevronDown className={cn('h-4 w-4 transition-transform', openId === item.id && 'rotate-180')} />
          </button>
          {openId === item.id && <div className="px-4 pb-4 text-muted-foreground">{item.answer}</div>}
        </div>
      ))}
    </div>
  );
}

export default FAQAccordion;
