import React, { useRef } from 'react';
import { cn } from '@/lib/utils';

interface OTPInputProps { length?: number; value: string; onChange: (value: string) => void; className?: string; }

export function OTPInput({ length = 6, value, onChange, className }: OTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, char: string) => {
    if (!/^\d*$/.test(char)) return;
    const newValue = value.split('');
    newValue[index] = char;
    onChange(newValue.join(''));
    if (char && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) inputRefs.current[index - 1]?.focus();
  };

  return (
    <div className={cn('flex gap-2', className)}>
      {Array.from({ length }, (_, i) => (
        <input key={i} ref={el => inputRefs.current[i] = el} type="text" maxLength={1} value={value[i] || ''}
          onChange={e => handleChange(i, e.target.value)} onKeyDown={e => handleKeyDown(i, e)}
          className="w-12 h-14 text-center text-2xl font-mono rounded-lg border bg-background focus:border-primary focus:ring-1 focus:ring-primary" />
      ))}
    </div>
  );
}

export default OTPInput;
