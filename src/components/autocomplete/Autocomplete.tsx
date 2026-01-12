import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
}

export function Autocomplete({ value, onChange, options, placeholder, className }: AutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFiltered(options.filter(o => o.toLowerCase().includes(value.toLowerCase())));
  }, [value, options]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <Input value={value} onChange={e => { onChange(e.target.value); setIsOpen(true); }}
        placeholder={placeholder} onFocus={() => setIsOpen(true)} />
      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 max-h-48 overflow-auto bg-popover border rounded-md shadow-lg">
          {filtered.map(opt => (
            <li key={opt} onClick={() => { onChange(opt); setIsOpen(false); }}
              className="px-3 py-2 cursor-pointer hover:bg-accent text-sm">{opt}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Autocomplete;
