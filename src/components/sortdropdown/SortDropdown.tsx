import React from 'react';
import { cn } from '@/lib/utils';

interface SortDropdownProps { options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; className?: string; }

export function SortDropdown({ options, value, onChange, className }: SortDropdownProps) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={cn('px-3 py-2 rounded-lg border bg-background text-sm', className)}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default SortDropdown;
