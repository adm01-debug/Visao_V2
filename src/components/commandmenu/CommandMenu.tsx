import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Search, Command } from 'lucide-react';
import { Modal } from '@/components/overlays/Modal';

interface CommandItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect: () => void;
}

interface CommandMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandItem[];
  placeholder?: string;
}

export function CommandMenu({ isOpen, onClose, items, placeholder = 'Buscar comandos...' }: CommandMenuProps) {
  const [search, setSearch] = useState('');
  const filtered = items.filter(item => item.label.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => {
    if (!isOpen) setSearch('');
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="flex items-center gap-2 border-b pb-3 mb-3">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none"
          autoFocus
        />
      </div>
      <div className="max-h-64 overflow-y-auto">
        {filtered.map(item => (
          <button key={item.id} onClick={() => { item.onSelect(); onClose(); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors">
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.shortcut && <kbd className="text-xs text-muted-foreground">{item.shortcut}</kbd>}
          </button>
        ))}
      </div>
    </Modal>
  );
}

export default CommandMenu;
