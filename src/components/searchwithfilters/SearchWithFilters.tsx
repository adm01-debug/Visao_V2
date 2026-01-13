import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchWithFiltersProps { filters: { id: string; label: string }[]; onSearch: (query: string, filters: string[]) => void; placeholder?: string; className?: string; }

export function SearchWithFilters({ filters, onSearch, placeholder = 'Pesquisar...', className }: SearchWithFiltersProps) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const toggleFilter = (id: string) => {
    const newFilters = activeFilters.includes(id) ? activeFilters.filter(f => f !== id) : [...activeFilters, id];
    setActiveFilters(newFilters);
  };

  const handleSearch = () => onSearch(query, activeFilters);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder={placeholder} className="w-full pl-10 pr-4 py-2 rounded-lg border" />
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}><Filter className="h-4 w-4" /></Button>
        <Button onClick={handleSearch}>Buscar</Button>
      </div>
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button key={f.id} onClick={() => toggleFilter(f.id)}
              className={cn('px-3 py-1 rounded-full text-sm border', activeFilters.includes(f.id) ? 'bg-primary text-primary-foreground border-primary' : '')}>
              {f.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchWithFilters;
