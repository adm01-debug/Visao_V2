import React from 'react';
import { cn } from '@/lib/utils';

interface HotkeyDisplayProps { keys: string[]; description?: string; className?: string; }

export function HotkeyDisplay({ keys, description, className }: HotkeyDisplayProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <React.Fragment key={i}>
            <kbd className="px-2 py-1 text-xs font-mono bg-muted border rounded shadow-sm">{key}</kbd>
            {i < keys.length - 1 && <span className="text-muted-foreground">+</span>}
          </React.Fragment>
        ))}
      </div>
      {description && <span className="text-sm text-muted-foreground">{description}</span>}
    </div>
  );
}

export default HotkeyDisplay;
