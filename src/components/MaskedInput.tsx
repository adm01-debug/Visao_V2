/**
 * Masked Input Component
 * Input with dynamic masks for formatted data entry
 */

import React, { useState, useCallback, useMemo, forwardRef } from 'react';
import { cn } from '@/utils/cn';

export type MaskType = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'date' | 'time' | 'currency' | 'creditCard' | 'custom';

export interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask?: MaskType | string;
  onChange?: (value: string, maskedValue: string) => void;
  showMask?: boolean;
  unmaskOnChange?: boolean;
}

const MASKS: Record<string, string> = {
  cpf: '999.999.999-99',
  cnpj: '99.999.999/9999-99',
  phone: '(99) 99999-9999',
  cep: '99999-999',
  date: '99/99/9999',
  time: '99:99',
  currency: 'R$ #.###,##',
  creditCard: '9999 9999 9999 9999',
};

const applyMask = (value: string, mask: string): string => {
  if (!value) return '';
  
  // Handle currency specially
  if (mask.includes('#')) {
    const numbers = value.replace(/\D/g, '');
    const amount = parseInt(numbers || '0') / 100;
    return amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const cleanValue = value.replace(/\D/g, '');
  let maskedValue = '';
  let valueIndex = 0;

  for (let i = 0; i < mask.length && valueIndex < cleanValue.length; i++) {
    if (mask[i] === '9') {
      maskedValue += cleanValue[valueIndex];
      valueIndex++;
    } else {
      maskedValue += mask[i];
      if (cleanValue[valueIndex] === mask[i]) {
        valueIndex++;
      }
    }
  }

  return maskedValue;
};

const unmask = (value: string): string => {
  return value.replace(/\D/g, '');
};

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(({
  mask = 'custom',
  onChange,
  showMask = false,
  unmaskOnChange = true,
  className,
  placeholder,
  value: controlledValue,
  ...props
}, ref) => {
  const [internalValue, setInternalValue] = useState('');
  
  const maskPattern = useMemo(() => {
    return MASKS[mask] || mask;
  }, [mask]);

  const displayValue = useMemo(() => {
    const val = controlledValue !== undefined ? String(controlledValue) : internalValue;
    return applyMask(val, maskPattern);
  }, [controlledValue, internalValue, maskPattern]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const masked = applyMask(rawValue, maskPattern);
    const unmasked = unmask(masked);

    setInternalValue(masked);
    onChange?.(unmaskOnChange ? unmasked : masked, masked);
  }, [maskPattern, unmaskOnChange, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 46, 9, 27, 13].includes(e.keyCode)) return;
    
    // Allow: Ctrl/Cmd + A, C, V, X
    if ((e.ctrlKey || e.metaKey) && [65, 67, 86, 88].includes(e.keyCode)) return;
    
    // Allow: home, end, left, right
    if ([35, 36, 37, 39].includes(e.keyCode)) return;
    
    // Block if not a number
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  }, []);

  const displayPlaceholder = useMemo(() => {
    if (placeholder) return placeholder;
    if (showMask) return maskPattern.replace(/9/g, '_');
    return '';
  }, [placeholder, showMask, maskPattern]);

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={displayPlaceholder}
      className={cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm',
        'ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground focus-visible:outline-none',
        'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  );
});

MaskedInput.displayName = 'MaskedInput';

export default MaskedInput;
