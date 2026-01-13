import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { CreditCard } from 'lucide-react';

interface CreditCardInputProps { onComplete?: (data: { number: string; expiry: string; cvc: string }) => void; className?: string; }

export function CreditCardInput({ onComplete, className }: CreditCardInputProps) {
  const [number, setNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');

  const formatNumber = (v: string) => v.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
  const formatExpiry = (v: string) => { const clean = v.replace(/\D/g, ''); return clean.length >= 2 ? clean.slice(0, 2) + '/' + clean.slice(2, 4) : clean; };

  return (
    <div className={cn('space-y-3 p-4 rounded-lg border bg-card', className)}>
      <div className="relative">
        <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <input value={number} onChange={e => setNumber(formatNumber(e.target.value))} placeholder="0000 0000 0000 0000"
          className="w-full pl-10 pr-4 py-3 rounded-lg border bg-background font-mono" />
      </div>
      <div className="flex gap-3">
        <input value={expiry} onChange={e => setExpiry(formatExpiry(e.target.value))} placeholder="MM/AA" maxLength={5}
          className="w-24 px-4 py-3 rounded-lg border bg-background font-mono text-center" />
        <input value={cvc} onChange={e => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CVC" maxLength={4}
          className="w-20 px-4 py-3 rounded-lg border bg-background font-mono text-center" />
      </div>
    </div>
  );
}

export default CreditCardInput;
