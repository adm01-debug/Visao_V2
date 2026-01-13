import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

interface PinInputProps { length?: number; value: string; onChange: (value: string) => void; mask?: boolean; className?: string; }

export function PinInput({ length = 4, value, onChange, mask = true, className }: PinInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newValue = value.split('');
    newValue[index] = char;
    onChange(newValue.join(''));
    if (char && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  return (
    <div className={cn('flex gap-3', className)}>
      {Array.from({ length }, (_, i) => (
        <input key={i} ref={el => inputRefs.current[i] = el} type={mask ? 'password' : 'text'} maxLength={1} value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)}
          className="w-14 h-14 text-center text-2xl rounded-full border-2 bg-background focus:border-primary" />
      ))}
    </div>
  );
}

export default PinInput;
