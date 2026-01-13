import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, Command } from 'lucide-react';

interface CommandItem { id: string; label: string; icon?: React.ReactNode; shortcut?: string[]; action: () => void; }
interface CommandPaletteProps { commands: CommandItem[]; placeholder?: string; className?: string; }

export function CommandPalette({ commands, placeholder = 'Digite um comando...', className }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setOpen(o => !o); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const filtered = commands.filter(c => c.label.toLowerCase().includes(search.toLowerCase()));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/50" />
      <div className={cn('relative w-full max-w-lg bg-popover rounded-lg shadow-xl border', className)} onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 p-3 border-b">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} className="flex-1 bg-transparent outline-none" autoFocus />
        </div>
        <div className="max-h-80 overflow-auto p-2">
          {filtered.map(cmd => (
            <button key={cmd.id} onClick={() => { cmd.action(); setOpen(false); }}
              className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent text-left">
              {cmd.icon}<span className="flex-1">{cmd.label}</span>
              {cmd.shortcut && <kbd className="text-xs text-muted-foreground">{cmd.shortcut.join('+')}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
