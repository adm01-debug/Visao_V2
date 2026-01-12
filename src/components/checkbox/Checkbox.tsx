import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({ checked, onChange, label, disabled = false, className }: CheckboxProps) {
  return (
    <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'h-4 w-4 rounded border flex items-center justify-center transition-colors',
          checked ? 'bg-primary border-primary' : 'border-gray-300',
          !disabled && 'hover:border-primary'
        )}
      >
        {checked && <Check className="h-3 w-3 text-white" />}
      </button>
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

export default Checkbox;
