import React from 'react';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';

interface ThemeToggleProps { theme: 'light' | 'dark' | 'system'; onChange: (theme: 'light' | 'dark' | 'system') => void; className?: string; }

export function ThemeToggle({ theme, onChange, className }: ThemeToggleProps) {
  const options = [{ value: 'light' as const, icon: Sun }, { value: 'dark' as const, icon: Moon }, { value: 'system' as const, icon: Monitor }];
  return (
    <div className={cn('flex rounded-lg border p-1 bg-muted', className)}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} className={cn('p-2 rounded-md transition-colors', theme === o.value ? 'bg-background shadow' : 'hover:bg-background/50')}>
          <o.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

export default ThemeToggle;
