import React from 'react';
import { cn } from '@/lib/utils';

interface KeyboardShortcutProps {
  keys: string[];
  className?: string;
}

export function KeyboardShortcut({ keys, className }: KeyboardShortcutProps) {
  return (
    <span className={cn('inline-flex gap-1', className)}>
      {keys.map((key, i) => (
        <React.Fragment key={i}>
          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border">{key}</kbd>
          {i < keys.length - 1 && <span className="text-muted-foreground">+</span>}
        </React.Fragment>
      ))}
    </span>
  );
}

export default KeyboardShortcut;
