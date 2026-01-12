import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Plus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface TagManagerProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  maxTags?: number;
  placeholder?: string;
  className?: string;
}

export function TagManager({ tags, onChange, suggestions = [], maxTags, placeholder = 'Adicionar tag...', className }: TagManagerProps) {
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed) && (!maxTags || tags.length < maxTags)) {
      onChange([...tags, trimmed]);
    }
    setInput('');
  };

  const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));

  const filtered = suggestions.filter(s => s.includes(input.toLowerCase()) && !tags.includes(s));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap gap-2">
        {tags.map(tag => (
          <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm">
            <Tag className="h-3 w-3" />{tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="h-3 w-3" /></button>
          </span>
        ))}
      </div>
      <div className="relative">
        <Input value={input} onChange={e => { setInput(e.target.value); setShowSuggestions(true); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(input); } }}
          onFocus={() => setShowSuggestions(true)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={placeholder} disabled={maxTags ? tags.length >= maxTags : false} />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute top-full mt-1 w-full bg-popover border rounded-lg shadow-lg z-10 max-h-40 overflow-auto">
            {filtered.map(s => <button key={s} onClick={() => addTag(s)} className="w-full px-3 py-2 text-left text-sm hover:bg-accent">{s}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

export default TagManager;
