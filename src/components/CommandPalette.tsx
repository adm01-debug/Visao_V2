/**
 * Command Palette (Cmd+K)
 */
import React, { useState, useEffect, useCallback } from 'react';
import { Search, Command } from 'lucide-react';
export interface CommandItem { id: string; title: string; icon?: React.ReactNode; action: () => void; category?: string; }
export const CommandPalette: React.FC<{ commands: CommandItem[] }> = ({ commands }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  useEffect(() => { const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsOpen(o => !o); } if (e.key === 'Escape') setIsOpen(false); }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
  const filtered = commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase()));
  const execute = useCallback((cmd: CommandItem) => { cmd.action(); setIsOpen(false); setQuery(''); }, []);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50" onClick={() => setIsOpen(false)}>
      <div className="bg-background rounded-lg shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b"><Search className="h-5 w-5 text-muted-foreground" /><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Digite um comando..." className="flex-1 bg-transparent outline-none" /></div>
        <div className="max-h-80 overflow-auto p-2">
          {filtered.map(cmd => (<button key={cmd.id} onClick={() => execute(cmd)} className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent text-left">{cmd.icon}<span>{cmd.title}</span></button>))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-4">Nenhum comando encontrado</p>}
        </div>
      </div>
    </div>
  );
};
export default CommandPalette;
