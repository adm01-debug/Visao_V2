import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        onChange('');
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onChange]);

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 h-9 bg-secondary/50 border-border/50 focus:bg-background"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
          onClick={() => onChange('')}
        >
          <X className="w-3 h-3" />
        </Button>
      )}
      <kbd className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground pointer-events-none">
        {value ? '' : '⌘K'}
      </kbd>
    </div>
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
