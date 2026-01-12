import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface FilterOption { id: string; label: string; type: 'text' | 'select' | 'date' | 'range'; options?: { value: string; label: string }[]; }

interface AdvancedSearchProps {
  filters: FilterOption[];
  onSearch: (query: string, filters: Record<string, unknown>) => void;
  placeholder?: string;
  className?: string;
}

export function AdvancedSearch({ filters, onSearch, placeholder = 'Buscar...', className }: AdvancedSearchProps) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, unknown>>({});

  const handleSearch = () => onSearch(query, activeFilters);
  const clearFilters = () => { setActiveFilters({}); setQuery(''); };
  const activeCount = Object.values(activeFilters).filter(v => v !== '' && v !== null).length;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} placeholder={placeholder} className="pl-10" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 mr-1" />Filtros{activeCount > 0 && <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary text-primary-foreground">{activeCount}</span>}
          <ChevronDown className={cn('h-4 w-4 ml-1 transition-transform', showFilters && 'rotate-180')} />
        </Button>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>
      {showFilters && (
        <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filters.map(f => (
              <div key={f.id}>
                <label className="text-xs font-medium">{f.label}</label>
                {f.type === 'select' ? (
                  <select value={String(activeFilters[f.id] || '')} onChange={e => setActiveFilters(p => ({ ...p, [f.id]: e.target.value }))}
                    className="w-full h-9 mt-1 rounded-md border bg-background px-2 text-sm">
                    <option value="">Todos</option>
                    {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <Input type={f.type === 'date' ? 'date' : 'text'} value={String(activeFilters[f.id] || '')}
                    onChange={e => setActiveFilters(p => ({ ...p, [f.id]: e.target.value }))} className="mt-1" />
                )}
              </div>
            ))}
          </div>
          {activeCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Limpar filtros</Button>}
        </div>
      )}
    </div>
  );
}

export default AdvancedSearch;
