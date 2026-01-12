import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Filter {
  key: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: Filter[];
  onRemove: (key: string) => void;
  onClearAll?: () => void;
  className?: string;
}

export function FilterChips({ filters, onRemove, onClearAll, className }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {filters.map(filter => (
        <span key={filter.key} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm">
          <span className="font-medium">{filter.label}:</span> {filter.value}
          <button onClick={() => onRemove(filter.key)}><X className="h-3 w-3" /></button>
        </span>
      ))}
      {onClearAll && filters.length > 1 && (
        <button onClick={onClearAll} className="text-sm text-muted-foreground hover:text-foreground">
          Limpar todos
        </button>
      )}
    </div>
  );
}

export default FilterChips;
