import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';

interface Address { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string; }
interface AddressInputProps { value: Address; onChange: (value: Address) => void; className?: string; }

export function AddressInput({ value, onChange, className }: AddressInputProps) {
  const update = (field: keyof Address, val: string) => onChange({ ...value, [field]: val });

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-3">
        <input value={value.zipCode} onChange={e => update('zipCode', e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder="CEP" className="w-32 px-3 py-2 rounded-lg border" />
        <input value={value.state} onChange={e => update('state', e.target.value.toUpperCase().slice(0, 2))}
          placeholder="UF" className="w-20 px-3 py-2 rounded-lg border" />
      </div>
      <input value={value.city} onChange={e => update('city', e.target.value)} placeholder="Cidade" className="w-full px-3 py-2 rounded-lg border" />
      <input value={value.neighborhood} onChange={e => update('neighborhood', e.target.value)} placeholder="Bairro" className="w-full px-3 py-2 rounded-lg border" />
      <div className="flex gap-3">
        <input value={value.street} onChange={e => update('street', e.target.value)} placeholder="Rua" className="flex-1 px-3 py-2 rounded-lg border" />
        <input value={value.number} onChange={e => update('number', e.target.value)} placeholder="Nº" className="w-24 px-3 py-2 rounded-lg border" />
      </div>
      <input value={value.complement || ''} onChange={e => update('complement', e.target.value)} placeholder="Complemento" className="w-full px-3 py-2 rounded-lg border" />
    </div>
  );
}

export default AddressInput;
