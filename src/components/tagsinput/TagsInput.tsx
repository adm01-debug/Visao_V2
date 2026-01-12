import React, { useState, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface TagsInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  className?: string;
}

export function TagsInput({ value, onChange, placeholder = 'Adicionar tag...', maxTags, className }: TagsInputProps) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim()) && (!maxTags || value.length < maxTags)) {
        onChange([...value, input.trim()]);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const removeTag = (tag: string) => onChange(value.filter(t => t !== tag));

  return (
    <div className={cn('flex flex-wrap gap-2 p-2 border rounded-md focus-within:ring-2 focus-within:ring-primary', className)}>
      {value.map(tag => (
        <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-sm">
          {tag}
          <button onClick={() => removeTag(tag)}><X className="h-3 w-3" /></button>
        </span>
      ))}
      <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
        placeholder={placeholder} className="flex-1 min-w-[120px] bg-transparent outline-none text-sm" />
    </div>
  );
}

export default TagsInput;
