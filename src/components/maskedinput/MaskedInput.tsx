import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, maskCreditCard } from '@/lib/mask';

type MaskType = 'cpf' | 'cnpj' | 'phone' | 'cep' | 'date' | 'creditCard';

interface MaskedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  mask: MaskType;
  value: string;
  onChange: (value: string) => void;
}

const masks: Record<MaskType, (value: string) => string> = {
  cpf: maskCPF, cnpj: maskCNPJ, phone: maskPhone, cep: maskCEP, date: maskDate, creditCard: maskCreditCard,
};

export function MaskedInput({ mask, value, onChange, ...props }: MaskedInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = masks[mask](e.target.value);
    onChange(masked);
  };

  return <Input value={value} onChange={handleChange} {...props} />;
}

export default MaskedInput;
