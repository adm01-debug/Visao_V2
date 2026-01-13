import React from 'react';
import { cn } from '@/lib/utils';
import { CreditCard, Banknote, Smartphone, QrCode } from 'lucide-react';

interface PaymentMethodSelectorProps { value: string; onChange: (value: string) => void; className?: string; }

const methods = [
  { id: 'credit', label: 'Cartão de Crédito', icon: CreditCard },
  { id: 'debit', label: 'Cartão de Débito', icon: CreditCard },
  { id: 'pix', label: 'PIX', icon: QrCode },
  { id: 'boleto', label: 'Boleto', icon: Banknote },
];

export function PaymentMethodSelector({ value, onChange, className }: PaymentMethodSelectorProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {methods.map(m => (
        <button key={m.id} onClick={() => onChange(m.id)}
          className={cn('flex items-center gap-3 p-4 rounded-lg border transition-colors', value === m.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground')}>
          <m.icon className={cn('h-5 w-5', value === m.id && 'text-primary')} />
          <span className="text-sm font-medium">{m.label}</span>
        </button>
      ))}
    </div>
  );
}

export default PaymentMethodSelector;
