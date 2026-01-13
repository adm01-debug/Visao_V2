import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PricingCardProps { name: string; price: number; period?: string; description?: string; features: string[]; highlighted?: boolean; buttonText?: string; onSelect?: () => void; className?: string; }

export function PricingCard({ name, price, period = '/mês', description, features, highlighted, buttonText = 'Começar', onSelect, className }: PricingCardProps) {
  return (
    <div className={cn('p-6 rounded-xl border bg-card', highlighted && 'border-primary shadow-lg scale-105', className)}>
      {highlighted && <span className="inline-block px-3 py-1 bg-primary text-primary-foreground text-xs rounded-full mb-4">Popular</span>}
      <h3 className="text-xl font-bold">{name}</h3>
      <div className="mt-4 mb-6"><span className="text-4xl font-bold">R$ {price}</span><span className="text-muted-foreground">{period}</span></div>
      {description && <p className="text-sm text-muted-foreground mb-6">{description}</p>}
      <ul className="space-y-3 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" />{f}</li>
        ))}
      </ul>
      <Button className="w-full" variant={highlighted ? 'default' : 'outline'} onClick={onSelect}>{buttonText}</Button>
    </div>
  );
}

export default PricingCard;
