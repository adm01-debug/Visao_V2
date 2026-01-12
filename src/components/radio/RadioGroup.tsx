import React, { createContext, useContext } from 'react';
import { cn } from '@/lib/utils';

interface RadioContextType {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RadioContext = createContext<RadioContextType | null>(null);

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  name: string;
  children: React.ReactNode;
  className?: string;
}

export function RadioGroup({ value, onChange, name, children, className }: RadioGroupProps) {
  return (
    <RadioContext.Provider value={{ value, onChange, name }}>
      <div role="radiogroup" className={cn('space-y-2', className)}>{children}</div>
    </RadioContext.Provider>
  );
}

interface RadioProps {
  value: string;
  label: string;
  disabled?: boolean;
  className?: string;
}

export function Radio({ value, label, disabled = false, className }: RadioProps) {
  const context = useContext(RadioContext);
  if (!context) return null;

  const isChecked = context.value === value;

  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <input
        type="radio"
        name={context.name}
        value={value}
        checked={isChecked}
        onChange={() => context.onChange(value)}
        disabled={disabled}
        className="h-4 w-4 text-primary focus:ring-primary"
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

export default RadioGroup;
