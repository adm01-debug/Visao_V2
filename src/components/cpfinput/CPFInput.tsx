import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { maskCPF } from '@/lib/mask';

interface CPFInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  className?: string;
}

export function CPFInput({ value, onChange, error, className }: CPFInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(maskCPF(e.target.value));
  };

  return (
    <Input value={value} onChange={handleChange} placeholder="000.000.000-00"
      className={cn(error && 'border-destructive', className)} />
  );
}

export default CPFInput;
