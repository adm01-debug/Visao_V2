import React from 'react';
import { cn } from '@/lib/utils';

interface IPInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function IPInput({ value, onChange, disabled = false, className }: IPInputProps) {
  const parts = value.split('.').concat(['', '', '', '']).slice(0, 4);

  const handleChange = (index: number, val: string) => {
    const num = parseInt(val, 10);
    if (val === '' || (num >= 0 && num <= 255)) {
      const newParts = [...parts];
      newParts[index] = val === '' ? '' : String(Math.min(255, num));
      onChange(newParts.join('.'));
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          <input type="text" value={part} onChange={e => handleChange(i, e.target.value)} maxLength={3} disabled={disabled}
            className="w-14 h-10 text-center rounded-md border bg-background" />
          {i < 3 && <span className="text-muted-foreground">.</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

export default IPInput;
