import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface PricingCardProps {
  name: string;
  price: number;
  period?: string;
  features: string[];
  popular?: boolean;
  buttonText?: string;
  onSelect?: () => void;
  className?: string;
}

export function PricingCard({ name, price, period = '/mês', features, popular = false, buttonText = 'Selecionar', onSelect, className }: PricingCardProps) {
  return (
    <div className={cn('relative p-6 rounded-lg border bg-card', popular && 'border-primary shadow-lg', className)}>
      {popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">Popular</div>}
      <h3 className="text-lg font-semibold mb-2">{name}</h3>
      <div className="mb-4">
        <span className="text-3xl font-bold">R$ {price}</span>
        <span className="text-muted-foreground">{period}</span>
      </div>
      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-500" />
            {f}
          </li>
        ))}
      </ul>
      <Button onClick={onSelect} variant={popular ? 'default' : 'outline'} className="w-full">{buttonText}</Button>
    </div>
  );
}

export default PricingCard;
