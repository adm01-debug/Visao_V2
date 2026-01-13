import React from 'react';
import { cn } from '@/lib/utils';
import { Percent, Calculator } from 'lucide-react';

interface DiscountBadgeProps { amount: number; type?: 'percent' | 'fixed'; size?: 'sm' | 'md' | 'lg'; className?: string; }

const sizes = { sm: 'text-xs px-1.5 py-0.5', md: 'text-sm px-2 py-1', lg: 'text-base px-3 py-1.5' };

export function DiscountBadge({ amount, type = 'percent', size = 'md', className }: DiscountBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 bg-red-500 text-white font-bold rounded-full', sizes[size], className)}>
      {type === 'percent' ? <><Percent className="h-3 w-3" />-{amount}%</> : <>-R$ {amount.toFixed(2)}</>}
    </span>
  );
}

export default DiscountBadge;
