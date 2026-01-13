import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, X } from 'lucide-react';

interface SearchResult { id: string; title: string; subtitle?: string; icon?: React.ReactNode; }
interface SpotlightSearchProps { results: SearchResult[]; onSearch: (query: string) => void; onSelect: (result: SearchResult) => void; className?: string; }

export function SpotlightSearch({ results, onSearch, onSelect, className }: SpotlightSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === '/') { e.preventDefault(); setOpen(true); } if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => { onSearch(query); }, [query, onSearch]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className={cn('relative w-full max-w-2xl bg-card rounded-2xl shadow-2xl border overflow-hidden', className)} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b">
          <Search className="h-5 w-5 text-muted-foreground" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pesquisar..." className="flex-1 text-lg bg-transparent outline-none" autoFocus />
          <button onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-96 overflow-auto">{results.map(r => (
          <button key={r.id} onClick={() => { onSelect(r); setOpen(false); }} className="w-full flex items-center gap-3 p-4 hover:bg-accent border-b last:border-0">
            {r.icon}<div className="text-left"><p className="font-medium">{r.title}</p>{r.subtitle && <p className="text-sm text-muted-foreground">{r.subtitle}</p>}</div>
          </button>
        ))}</div>
      </div>
    </div>
  );
}

export default SpotlightSearch;
