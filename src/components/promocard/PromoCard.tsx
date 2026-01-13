import React from 'react';
import { cn } from '@/lib/utils';
import { Gift, Percent, Clock } from 'lucide-react';

interface PromoCardProps { title: string; description?: string; discount?: string; code?: string; expiresAt?: Date; className?: string; }

export function PromoCard({ title, description, discount, code, expiresAt, className }: PromoCardProps) {
  const isExpired = expiresAt && new Date() > expiresAt;
  return (
    <div className={cn('relative p-6 rounded-xl border bg-gradient-to-br from-primary/10 to-primary/5 overflow-hidden', isExpired && 'opacity-50', className)}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <Gift className="h-8 w-8 text-primary mb-4" />
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      {description && <p className="text-muted-foreground mb-4">{description}</p>}
      {discount && <div className="flex items-center gap-2 mb-4"><Percent className="h-5 w-5 text-primary" /><span className="text-2xl font-bold text-primary">{discount}</span></div>}
      {code && <div className="inline-block px-4 py-2 bg-background rounded-lg border-2 border-dashed font-mono text-lg">{code}</div>}
      {expiresAt && <p className="flex items-center gap-1 mt-4 text-sm text-muted-foreground"><Clock className="h-4 w-4" />{isExpired ? 'Expirado' : `Expira em ${expiresAt.toLocaleDateString('pt-BR')}`}</p>}
    </div>
  );
}

export default PromoCard;
