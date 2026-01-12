import React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Phone } from 'lucide-react';
import { maskPhone } from '@/lib/mask';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: boolean;
  className?: string;
}

export function PhoneInput({ value, onChange, placeholder = '(00) 00000-0000', error, className }: PhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(maskPhone(e.target.value));
  };

  return (
    <div className="relative">
      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input value={value} onChange={handleChange} placeholder={placeholder}
        className={cn('pl-10', error && 'border-destructive', className)} />
    </div>
  );
}

export default PhoneInput;
