import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, Camera, FileText, User, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface SearchResult {
  id: string;
  type: 'camera' | 'recording' | 'user' | 'event';
  title: string;
  subtitle?: string;
}

interface QuickSearchProps {
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

const icons = { camera: Camera, recording: FileText, user: User, event: Clock };

export function QuickSearch({ onSearch, onSelect, placeholder = 'Busca rápida...', className }: QuickSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = async (value: string) => {
    setQuery(value);
    if (value.length >= 2) {
      const r = await onSearch(value);
      setResults(r);
      setIsOpen(true);
    } else {
      setResults([]);
      setIsOpen(false);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input value={query} onChange={e => handleChange(e.target.value)} placeholder={placeholder} className="pl-9 pr-9" />
        {query && <button onClick={() => { setQuery(''); setResults([]); setIsOpen(false); }} className="absolute right-3 top-1/2 -translate-y-1/2"><X className="h-4 w-4" /></button>}
      </div>
      {isOpen && results.length > 0 && (
        <div className="absolute top-full mt-1 w-full bg-popover border rounded-lg shadow-lg z-50 max-h-64 overflow-auto">
          {results.map(r => {
            const Icon = icons[r.type];
            return (
              <button key={r.id} onClick={() => { onSelect(r); setIsOpen(false); setQuery(''); }}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div><p className="text-sm font-medium">{r.title}</p>{r.subtitle && <p className="text-xs text-muted-foreground">{r.subtitle}</p>}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default QuickSearch;
