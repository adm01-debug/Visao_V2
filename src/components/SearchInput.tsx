import { useState, useEffect, useRef } from 'react';
import { Search, X, Clock, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'search-history';
const MAX_HISTORY = 8;

function getSearchHistory(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveSearchHistory(history: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // Ignore
  }
}

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(getSearchHistory);
  const [isFocused, setIsFocused] = useState(false);

  // Update history when value changes and search is submitted
  const addToHistory = (term: string) => {
    if (!term.trim()) return;
    const newHistory = [term, ...history.filter(h => h !== term)].slice(0, MAX_HISTORY);
    setHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  const removeFromHistory = (term: string) => {
    const newHistory = history.filter(h => h !== term);
    setHistory(newHistory);
    saveSearchHistory(newHistory);
  };

  const clearHistory = () => {
    setHistory([]);
    saveSearchHistory([]);
  };

  const handleSelect = (term: string) => {
    onChange(term);
    addToHistory(term);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Add to history on Enter
  const handleKeyDownInput = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      addToHistory(value.trim());
      setIsOpen(false);
    }
  };

  // Filter suggestions based on current value
  const suggestions = value.trim()
    ? history.filter(h => h.toLowerCase().includes(value.toLowerCase()) && h !== value)
    : history;

  return (
    <Popover open={isOpen && (suggestions.length > 0 || history.length > 0)} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative", className)}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              setIsOpen(true);
            }}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDownInput}
            placeholder={placeholder}
            className="pl-9 pr-16 h-9 bg-secondary/50 border-border/50 focus:bg-background"
          />
          {value && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-8 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onChange('')}
            >
              <X className="w-3 h-3" />
            </Button>
          )}
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground pointer-events-none">
            ⌘K
          </kbd>
        </div>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] p-0" 
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-64 overflow-y-auto">
          {suggestions.length > 0 ? (
            <>
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <span className="text-xs text-muted-foreground font-medium">
                  {value ? 'Sugestões' : 'Buscas recentes'}
                </span>
                {!value && history.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                    onClick={clearHistory}
                  >
                    Limpar
                  </Button>
                )}
              </div>
              <div className="py-1">
                {suggestions.map((term, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between px-3 py-2 hover:bg-secondary cursor-pointer group"
                    onClick={() => handleSelect(term)}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-sm">{term}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(term);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          ) : value && history.length > 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Nenhuma sugestão encontrada
            </div>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Utility function to search in text
export function searchInText(text: string | undefined | null, query: string): boolean {
  if (!text || !query) return true;
  return text.toLowerCase().includes(query.toLowerCase());
}

// Filter cameras by search query
export function filterCamerasBySearch<T extends { name: string; location: string }>(
  cameras: T[],
  query: string
): T[] {
  if (!query.trim()) return cameras;
  
  return cameras.filter(camera => 
    searchInText(camera.name, query) || 
    searchInText(camera.location, query)
  );
}

// Filter alerts by search query
export function filterAlertsBySearch<T extends { message: string; camera_name?: string; cameraName?: string }>(
  alerts: T[],
  query: string
): T[] {
  if (!query.trim()) return alerts;
  
  return alerts.filter(alert => 
    searchInText(alert.message, query) || 
    searchInText(alert.camera_name || alert.cameraName, query)
  );
}
