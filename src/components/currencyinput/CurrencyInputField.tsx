import React from 'react';
import { cn } from '@/lib/utils';

interface CurrencyInputFieldProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  locale?: string;
  className?: string;
}

export function CurrencyInputField({ value, onChange, currency = 'BRL', locale = 'pt-BR', className }: CurrencyInputFieldProps) {
  const formatted = new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    onChange(parseInt(raw || '0', 10) / 100);
  };

  return (
    <div className={cn('relative', className)}>
      <input type="text" value={formatted} onChange={handleChange} className="w-full px-4 py-2 rounded-md border bg-background text-right font-mono" />
    </div>
  );
}

export default CurrencyInputField;
