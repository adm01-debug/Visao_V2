import React from 'react';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
  theme: Theme;
  onChange: (theme: Theme) => void;
  showLabel?: boolean;
  className?: string;
}

const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Claro' },
  { value: 'dark', icon: Moon, label: 'Escuro' },
  { value: 'system', icon: Monitor, label: 'Sistema' },
];

export function ThemeToggle({ theme, onChange, showLabel = false, className }: ThemeToggleProps) {
  return (
    <div className={cn('inline-flex rounded-md border', className)}>
      {themes.map(t => (
        <Button key={t.value} variant={theme === t.value ? 'secondary' : 'ghost'} size="sm" onClick={() => onChange(t.value)}
          className={cn('rounded-none first:rounded-l-md last:rounded-r-md', theme === t.value && 'bg-accent')}>
          <t.icon className="h-4 w-4" />
          {showLabel && <span className="ml-2">{t.label}</span>}
        </Button>
      ))}
    </div>
  );
}

export default ThemeToggle;
