/**
 * Tags Input Component
 * Multi-tag input with autocomplete support
 */

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { X } from 'lucide-react';

export interface Tag {
  id: string;
  label: string;
  color?: string;
}

export interface TagsInputProps {
  value?: Tag[];
  onChange?: (tags: Tag[]) => void;
  suggestions?: Tag[];
  placeholder?: string;
  maxTags?: number;
  allowCreate?: boolean;
  disabled?: boolean;
  validateTag?: (tag: string) => boolean | string;
  className?: string;
}

const TAG_COLORS = [
  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
];

export const TagsInput: React.FC<TagsInputProps> = ({
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Adicionar tag...',
  maxTags,
  allowCreate = true,
  disabled = false,
  validateTag,
  className,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return suggestions;
    const lower = inputValue.toLowerCase();
    return suggestions.filter(
      s => s.label.toLowerCase().includes(lower) && !value.some(t => t.id === s.id)
    );
  }, [inputValue, suggestions, value]);

  const addTag = useCallback((tag: Tag | string) => {
    if (disabled) return;
    if (maxTags && value.length >= maxTags) {
      setError(`Máximo de ${maxTags} tags`);
      return;
    }

    let newTag: Tag;
    if (typeof tag === 'string') {
      const trimmed = tag.trim();
      if (!trimmed) return;

      if (validateTag) {
        const result = validateTag(trimmed);
        if (result !== true) {
          setError(typeof result === 'string' ? result : 'Tag inválida');
          return;
        }
      }

      if (value.some(t => t.label.toLowerCase() === trimmed.toLowerCase())) {
        setError('Tag já existe');
        return;
      }

      newTag = { id: `tag-${Date.now()}`, label: trimmed };
    } else {
      if (value.some(t => t.id === tag.id)) {
        setError('Tag já existe');
        return;
      }
      newTag = tag;
    }

    setError(null);
    onChange?.([...value, newTag]);
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }, [disabled, maxTags, value, validateTag, onChange]);

  const removeTag = useCallback((tagId: string) => {
    if (disabled) return;
    onChange?.(value.filter(t => t.id !== tagId));
  }, [disabled, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredSuggestions[highlightedIndex]) {
        addTag(filteredSuggestions[highlightedIndex]);
      } else if (inputValue.trim() && allowCreate) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1].id);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => 
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  }, [highlightedIndex, filteredSuggestions, inputValue, allowCreate, value, addTag, removeTag]);

  const getTagColor = (index: number) => TAG_COLORS[index % TAG_COLORS.length];

  return (
    <div className={cn('tags-input relative', className)} ref={containerRef}>
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 border rounded-lg bg-background min-h-[42px]',
          'focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-red-500'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {/* Tags */}
        {value.map((tag, index) => (
          <span
            key={tag.id}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm',
              tag.color || getTagColor(index)
            )}
          >
            {tag.label}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag.id); }}
                className="hover:bg-black/10 rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input */}
        {(!maxTags || value.length < maxTags) && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] bg-transparent outline-none text-sm"
          />
        )}
      </div>

      {/* Error message */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Suggestions dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => addTag(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors',
                highlightedIndex === index && 'bg-accent'
              )}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      )}

      {/* Create new tag hint */}
      {showSuggestions && inputValue.trim() && allowCreate && filteredSuggestions.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg p-2">
          <p className="text-sm text-muted-foreground">
            Pressione Enter para criar "{inputValue.trim()}"
          </p>
        </div>
      )}
    </div>
  );
};

export default TagsInput;
