import React from 'react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatCurrency';

interface PriceTagProps {
  price: number;
  originalPrice?: number;
  currency?: 'BRL' | 'USD' | 'EUR';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = { sm: 'text-lg', md: 'text-2xl', lg: 'text-3xl' };

export function PriceTag({ price, originalPrice, currency = 'BRL', size = 'md', className }: PriceTagProps) {
  const hasDiscount = originalPrice && originalPrice > price;
  const discount = hasDiscount ? Math.round((1 - price / originalPrice!) * 100) : 0;

  return (
    <div className={cn('flex items-baseline gap-2', className)}>
      <span className={cn('font-bold text-primary', sizeClasses[size])}>{formatCurrency(price, currency)}</span>
      {hasDiscount && (
        <>
          <span className="text-muted-foreground line-through text-sm">{formatCurrency(originalPrice!, currency)}</span>
          <span className="text-xs font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded">-{discount}%</span>
        </>
      )}
    </div>
  );
}

export default PriceTag;
