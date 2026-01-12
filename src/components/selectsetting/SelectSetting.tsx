import React from 'react';
import { cn } from '@/lib/utils';

interface Option {
  value: string;
  label: string;
}

interface SelectSettingProps {
  label: string;
  description?: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function SelectSetting({ label, description, value, options, onChange, disabled = false, className }: SelectSettingProps) {
  return (
    <div className={cn('flex items-center justify-between py-3', className)}>
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="h-9 rounded-md border bg-background px-3 text-sm">
        {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  );
}

export default SelectSetting;
