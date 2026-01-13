import React, { useState, useRef } from 'react';
import { cn } from '@/lib/utils';

interface User { id: string; name: string; avatar?: string; }
interface MentionInputProps { users: User[]; value: string; onChange: (value: string) => void; placeholder?: string; className?: string; }

export function MentionInput({ users, value, onChange, placeholder, className }: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filter, setFilter] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);
    const match = val.match(/@(\w*)$/);
    if (match) { setFilter(match[1]); setShowSuggestions(true); } else { setShowSuggestions(false); }
  };

  const insertMention = (user: User) => {
    const newValue = value.replace(/@\w*$/, `@${user.name} `);
    onChange(newValue);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const filtered = users.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className={cn('relative', className)}>
      <textarea ref={inputRef} value={value} onChange={handleChange} placeholder={placeholder}
        className="w-full p-3 rounded-lg border bg-background resize-none" rows={3} />
      {showSuggestions && filtered.length > 0 && (
        <div className="absolute bottom-full mb-1 w-full max-h-40 overflow-auto bg-popover border rounded-lg shadow-lg">
          {filtered.map(u => (
            <button key={u.id} onClick={() => insertMention(u)} className="w-full flex items-center gap-2 p-2 hover:bg-accent">
              {u.avatar ? <img src={u.avatar} className="w-6 h-6 rounded-full" /> : <div className="w-6 h-6 rounded-full bg-muted" />}
              <span>{u.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MentionInput;
