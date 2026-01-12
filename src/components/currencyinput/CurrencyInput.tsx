import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { maskCurrency } from '@/lib/mask';

interface CurrencyInputProps {
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  className?: string;
}

export function CurrencyInput({ value, onChange, currency = 'BRL', className }: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(maskCurrency(String(value * 100)));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCurrency(e.target.value);
    setDisplayValue(masked);
    const numeric = parseFloat(masked.replace(/[^0-9,]/g, '').replace(',', '.')) || 0;
    onChange(numeric);
  };

  return <Input value={displayValue} onChange={handleChange} className={className} />;
}

export default CurrencyInput;
